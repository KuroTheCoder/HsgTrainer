import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";
import { DIFFICULTIES, SECTIONS, cefrBand, sectionGradient, sectionMeta } from "../sections";
import { IconCheck, IconSparkle, IconX, SectionIcon } from "../icons";
import { ScoreRing } from "../components/ScoreRing";
import { NoteBox, Reader } from "../components/Reader";
import DictPopup, { type DictRequest } from "../components/DictPopup";
import { play, playScore } from "../sfx";
import { renderMarkdown } from "../md";
import type { AnswerResult, CriterionScores, Question, WritingFeedback, WritingQuestion } from "../types";

type Phase = "config" | "running" | "results" | "writing" | "writing-result";

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const LENGTHS = [5, 10, 15, 20];

const CRITERIA: { key: keyof CriterionScores; label: string }[] = [
  { key: "content", label: "Content" },
  { key: "organization", label: "Organization" },
  { key: "vocabulary", label: "Vocabulary" },
  { key: "grammar", label: "Grammar" },
];

function StepsBar({ step }: { step: number }) {
  const steps = ["Configure", "Answer", "Results"];
  return (
    <div className="steps-bar">
      {steps.map((label, i) => {
        const n = i + 1;
        return (
          <span key={label} className={`step-pill ${step === n ? "active" : step > n ? "done" : ""}`}>
            <span className="step-index">{step > n ? "✓" : n}</span>
            {label}
          </span>
        );
      })}
    </div>
  );
}

function Stamp({ tone, text }: { tone: "ok" | "warn" | "bad"; text: string }) {
  return (
    <div className={`stamp ${tone}`} aria-hidden="true">
      {text}
    </div>
  );
}

function CreditsDots({ remaining }: { remaining: number }) {
  return (
    <span className="credits" title="AI feedback credits left today">
      <span className="credits-label">AI credits</span>
      {Array.from({ length: 3 }, (_, i) => (
        <i key={i} className={i < remaining ? "on" : ""} aria-hidden="true" />
      ))}
      <span className="muted small">{remaining} left today</span>
    </span>
  );
}

function KeyWords({ words, onLookup }: { words: string[]; onLookup: (word: string, x: number, y: number) => void }) {
  if (!words.length) return null;
  return (
    <div className="key-words">
      <span className="key-words-label">Key words & phrases</span>
      <div className="chip-row">
        {words.map((kw) => (
          <button
            key={kw}
            className="chip-btn chip-keyword"
            title="Look up in the dictionary"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              onLookup(kw, r.left, r.bottom + 6);
            }}
          >
            {kw}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Sections whose question type equals the section itself — the type tag
 *  would duplicate the section label (e.g. "word-form" in a Word Formation set). */
const SECTION_TYPES: Record<string, string> = {
  "word-formation": "word-form",
  cloze: "cloze",
};

function redundantTypeTag(section: string, qtype: string): boolean {
  return SECTION_TYPES[section] === qtype;
}

export default function Practice() {
  const [params] = useSearchParams();
  const initialSection = params.get("section") ?? "lexico-grammar";

  const [phase, setPhase] = useState<Phase>("config");
  const [section, setSection] = useState(initialSection);
  const [difficulty, setDifficulty] = useState("");
  const [count, setCount] = useState(10);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [results, setResults] = useState<AnswerResult[] | null>(null);
  const [dict, setDict] = useState<DictRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // writing mode state
  const [writingQ, setWritingQ] = useState<WritingQuestion | null>(null);
  const [writingResponse, setWritingResponse] = useState("");
  const [writingFeedback, setWritingFeedback] = useState<WritingFeedback | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const isWriting = section === "writing";
  const step = phase === "config" ? 1 : phase === "running" || phase === "writing" ? 2 : 3;

  const start = async (ids?: number[]) => {
    setBusy(true);
    setError(null);
    try {
      if (ids?.length) {
        const s = await api.startSession({ questionIds: ids });
        if (s.questions.length === 0) throw new Error("No verified questions for those ids.");
        setQuestions(s.questions);
        setSessionId(s.sessionId);
        setAnswers({});
        setResults(null);
        setPhase("running");
        return;
      }
      if (isWriting) {
        await drawWriting();
        return;
      }
      const s = await api.startSession({
        section: sectionMeta(section)?.deterministic ? section : undefined,
        difficulty: difficulty || undefined,
        count,
      });
      if (s.questions.length === 0) {
        setError("No verified questions for this section yet — the content team is keying papers.");
        setPhase("config");
        return;
      }
      setQuestions(s.questions);
      setSessionId(s.sessionId);
      setAnswers({});
      setResults(null);
      setPhase("running");
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to start session");
    } finally {
      setBusy(false);
    }
  };

  const drawWriting = async () => {
    const res = await api.writingQuestions(1);
    const q = res.questions[0];
    if (!q) {
      setError("No verified writing prompts yet.");
      setPhase("config");
      return;
    }
    setWritingQ(q);
    setWritingResponse("");
    setWritingFeedback(null);
    setPhase("writing");
  };

  // Support ?questions=1,2,3 (retry-mistakes flow from /mistakes).
  const startedRef = useRef(false);
  useEffect(() => {
    const ids = (params.get("questions") ?? "")
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
    if (ids.length > 0 && !startedRef.current) {
      startedRef.current = true;
      void start(ids);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const answeredCount = useMemo(() => questions.filter((q) => answers[q.id]?.trim()).length, [questions, answers]);

  const submit = async () => {
    if (!sessionId) return;
    const missing = questions.filter((q) => !answers[q.id]?.trim());
    if (missing.length > 0) {
      setError(`Answer every question first (${missing.length} left).`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api.submitAnswers(
        sessionId,
        questions.map((q) => ({ questionId: q.id, response: answers[q.id] ?? "" })),
      );
      setResults(res.results);
      playScore(Math.round((res.results.filter((r) => r.correct).length / res.results.length) * 100));
      setPhase("results");
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to submit");
    } finally {
      setBusy(false);
    }
  };

  const submitWriting = async () => {
    if (!writingQ || !writingResponse.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.scoreWriting(writingQ.id, writingResponse);
      setWritingFeedback(res.score);
      setRemaining(res.remaining);
      play("complete");
      setPhase("writing-result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "scoring failed");
    } finally {
      setBusy(false);
    }
  };

  const setAnswer = (id: number, value: string) => setAnswers((a) => ({ ...a, [id]: value }));

  const wordCount = useMemo(() => writingResponse.trim().split(/\s+/).filter(Boolean).length, [writingResponse]);

  const scoreSummary = useMemo(() => {
    if (!results) return null;
    const correct = results.filter((r) => r.correct).length;
    return { correct, total: results.length, pct: Math.round((correct / results.length) * 100) };
  }, [results]);

  const ringTone = (pct: number) => (pct >= 80 ? "ok" : pct >= 60 ? "warn" : "bad") as "ok" | "warn" | "bad";

  return (
    <div className="page">
      <div className="page-head">
        <h2>Practice</h2>
      </div>
      {dict && <DictPopup word={dict.word} x={dict.x} y={dict.y} onClose={() => setDict(null)} />}
      <StepsBar step={step} />
      <span className="sr-only" role="status">
        {busy ? "Working, please wait" : ""}
      </span>

      {phase === "config" && (
        <div className="card panel">
          <h3>1 · Pick a section</h3>
          <div className="section-tiles">
            {SECTIONS.map((s) => {
              const meta = sectionMeta(s.key);
              return (
                <button
                  key={s.key}
                  className={`section-tile ${section === s.key ? "selected" : ""}`}
                  style={{ "--card-tint": sectionGradient(s.color) } as CSSProperties}
                  onClick={() => setSection(s.key)}
                >
                  <span className="tile-icon" style={{ background: `${s.color}1f`, color: s.color }}>
                    <SectionIcon icon={s.icon} size={20} />
                  </span>
                  <span>
                    <b>{s.short}</b>
                    <span className="muted">{meta?.deterministic ? "Instant feedback" : "AI-scored"}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {!isWriting && (
            <div className="setup-row">
              <div className="field">
                Difficulty
                <div className="chip-row">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d.value || "any"}
                      className={`chip-btn ${difficulty === d.value ? "active" : ""}`}
                      title={d.title}
                      aria-pressed={difficulty === d.value}
                      onClick={() => setDifficulty(d.value)}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                Number of questions
                <div className="chip-row">
                  {LENGTHS.map((n) => (
                    <button key={n} className={`chip-btn ${count === n ? "active" : ""}`} onClick={() => setCount(n)}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isWriting && (
            <p className="hint" style={{ marginTop: 0, marginBottom: 18 }}>
              Writing is scored by AI on the HSG rubric — content, organization, vocabulary, grammar. You get 3
              feedback credits per day. Your essay is stored anonymously and used only to give you feedback (see the
              Writing bank).
            </p>
          )}

          {error && <div className="banner error">{error}</div>}
          <button className="btn btn-primary btn-lg btn-block" onClick={() => void start()} disabled={busy}>
            {busy ? "Starting…" : isWriting ? "Draw a writing prompt" : "Start practice"}
          </button>
        </div>
      )}

      {phase === "running" && questions.length > 0 && (
        <>
          <div className="card panel" style={{ padding: "16px 20px" }}>
            <div className="spread">
              <div className="row" style={{ flex: 1 }}>
                <strong>{sectionMeta(section)?.label ?? "Practice"}</strong>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
                </div>
                <span className="muted small">
                  {answeredCount}/{questions.length} answered
                </span>
              </div>
              <button className="btn btn-primary" onClick={submit} disabled={busy || answeredCount < questions.length}>
                {busy ? "Scoring…" : "Submit"}
              </button>
            </div>
            {error && (
              <div className="banner error" role="alert">
                {error}
              </div>
            )}
          </div>

          <div className="card panel">
            {questions.map((q, i) => (
              <div
                key={q.id}
                className={`question ${answers[q.id]?.trim() ? "" : "unanswered"}`}
                style={{ "--i": i } as CSSProperties}
              >
                <div className="question-head">
                  <span className="qnum">
                    <span className="qnum-icon">
                      <SectionIcon icon={sectionMeta(q.section)?.icon ?? ""} size={15} />
                      {i + 1}.
                    </span>
                  </span>
                  {!redundantTypeTag(section, q.qtype) && <span className="tag accent">{q.qtype}</span>}
                  <span className={`tag cefr ${cefrBand(q.difficulty)}`}>{q.difficulty}</span>
                  {!answers[q.id]?.trim() && <span className="tag bad">unanswered</span>}
                </div>
                <Reader questionId={q.id} text={q.prompt} className="prompt" onLookup={(w, x, y) => setDict({ word: w, x, y })} />
                {q.qtype === "mcq" && q.options.length > 0 ? (
                  <div className="options">
                    {q.options.map((opt, oi) => (
                      <label key={oi} className="option">
                        <input
                          type="radio"
                          name={`q${q.id}`}
                          value={OPTION_LETTERS[oi]}
                          checked={answers[q.id] === OPTION_LETTERS[oi]}
                          onChange={() => setAnswer(q.id, OPTION_LETTERS[oi] ?? "")}
                        />
                        <span className="opt-letter">{OPTION_LETTERS[oi]}</span>
                        {opt}
                      </label>
                    ))}
                  </div>
                ) : (
                  <input
                    type="text"
                    className="answer-input"
                    placeholder="Your answer…"
                    value={answers[q.id] ?? ""}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                  />
                )}
                <div className="question-actions">
                  <NoteBox questionId={q.id} section={q.section} label="Note" />
                </div>
              </div>
            ))}
            <button
              className="btn btn-primary btn-lg btn-block"
              style={{ marginTop: 8 }}
              onClick={submit}
              disabled={busy || answeredCount < questions.length}
            >
              {busy ? "Scoring…" : answeredCount < questions.length ? `Submit (${answeredCount}/${questions.length} answered)` : "Submit"}
            </button>
          </div>
        </>
      )}

      {phase === "results" && results && scoreSummary && (
        <>
          <div className="card summary">
            <ScoreRing value={scoreSummary.correct} max={scoreSummary.total} tone={ringTone(scoreSummary.pct)} />
            <Stamp
              tone={ringTone(scoreSummary.pct)}
              text={scoreSummary.pct >= 80 ? "A+" : scoreSummary.pct >= 60 ? "Keep going" : "Try again"}
            />
            <div className="summary-meta">
              <h3>
                {scoreSummary.pct >= 80 ? "Strong work!" : scoreSummary.pct >= 60 ? "Good — keep going" : "Room to grow"}
              </h3>
              <p className="muted">
                {scoreSummary.correct}/{scoreSummary.total} correct ({scoreSummary.pct}%). Wrong answers are saved
                to your mistake ledger.
              </p>
              <div className="row">
                <button className="btn btn-primary" onClick={() => setPhase("config")}>
                  New set
                </button>
              </div>
            </div>
          </div>
          <div className="card-grid">
            {results.map((r, i) => (
              <div key={r.questionId} className={`question ${r.correct ? "ok" : "wrong"}`} style={{ "--i": i } as CSSProperties}>
                <div className="question-head">
                  <span className="qnum">
                    <span className="qnum-icon">
                      {r.correct ? <IconCheck size={15} /> : <IconX size={15} />}
                      {i + 1}.
                    </span>
                  </span>
                  <span className={`tag ${r.correct ? "ok" : "bad"}`}>{r.correct ? "Correct" : "Wrong"}</span>
                </div>
                <p className="prompt">{renderMarkdown(questions[i]?.prompt ?? "")}</p>
                <KeyWords words={questions[i]?.keyWords ?? []} onLookup={(w, x, y) => setDict({ word: w, x, y })} />
                <p className="small">
                  Your answer: <b>{r.yourAnswer}</b>
                  {!r.correct && (
                    <>
                      {" "}
                      — correct: <b>{r.expected}</b>
                    </>
                  )}
                </p>
                {r.explanation && <p className="explanation">{renderMarkdown(r.explanation)}</p>}
              </div>
            ))}
          </div>
        </>
      )}

      {phase === "writing" && writingQ && (
        <div className="card panel">
          <div className="spread" style={{ marginBottom: 8 }}>
            <strong>Writing prompt</strong>
            <div className="row">
              {remaining !== null && <CreditsDots remaining={remaining} />}
              <button className="btn btn-sm btn-ghost" onClick={() => void drawWriting()} disabled={busy}>
                Another prompt
              </button>
            </div>
          </div>
          <Reader questionId={writingQ.id} text={writingQ.prompt} className="prompt" onLookup={(w, x, y) => setDict({ word: w, x, y })} />
          <textarea
            rows={12}
            className="answer-input"
            placeholder="Write your essay here…"
            value={writingResponse}
            onChange={(e) => setWritingResponse(e.target.value)}
            aria-describedby="writing-word-count"
          />
          <div className="question-actions">
            <NoteBox questionId={writingQ.id} section="writing" label="Note" />
          </div>
          <p className="hint" id="writing-word-count" style={{ marginTop: 6 }}>
            ≈ {wordCount} words
          </p>
          {error && (
            <div className="banner error" role="alert">
              {error}
            </div>
          )}
          <button
            className="btn btn-primary btn-lg btn-block"
            style={{ marginTop: 14 }}
            onClick={submitWriting}
            disabled={busy || !writingResponse.trim()}
          >
            <IconSparkle size={17} />
            {busy ? "Scoring with AI…" : "Get AI feedback"}
          </button>
        </div>
      )}

      {phase === "writing-result" && writingQ && writingFeedback && (
        <>
          <div className="card summary">
            <ScoreRing value={writingFeedback.total ?? 0} max={20} tone={ringTone(((writingFeedback.total ?? 0) / 20) * 100)} />
            <Stamp
              tone={ringTone(((writingFeedback.total ?? 0) / 20) * 100)}
              text={((writingFeedback.total ?? 0) / 20) * 100 >= 80 ? "A+" : ((writingFeedback.total ?? 0) / 20) * 100 >= 60 ? "Keep going" : "Try again"}
            />
            <div className="summary-meta">
              <h3>Band {writingFeedback.band ?? "—"}</h3>
              <p className="muted">
                {writingFeedback.status === "ok"
                  ? "Scored against the HSG rubric. Your essay is saved to your history."
                  : "Feedback unavailable right now."}
              </p>
              {remaining !== null && <CreditsDots remaining={remaining} />}
              <div className="row">
                <button className="btn btn-primary" onClick={() => setPhase("config")}>
                  New set
                </button>
              </div>
            </div>
          </div>
          <div className="card panel">
            <p className="prompt" style={{ marginTop: 0 }}>{renderMarkdown(writingQ.prompt)}</p>
            <KeyWords words={writingQ.keyWords ?? []} onLookup={(w, x, y) => setDict({ word: w, x, y })} />
            {writingFeedback.status !== "ok" && (
              <div className="banner warn" role="alert">
                {writingFeedback.error}
              </div>
            )}
            {writingFeedback.status === "ok" && writingFeedback.criterionScores && (
              <>
                <div className="criterion-grid">
                  {CRITERIA.map((c, ci) => {
                    const v = writingFeedback.criterionScores?.[c.key] ?? 0;
                    return (
                      <div key={c.key} className="criterion" style={{ "--i": ci } as CSSProperties}>
                        <span>{c.label}</span>
                        <div className="bar">
                          <div className="bar-fill" style={{ width: `${v * 20}%` }} />
                        </div>
                        <b>
                          {v}/5
                        </b>
                      </div>
                    );
                  })}
                </div>
                {writingFeedback.justification && (
                  <div>
                    <h4 style={{ marginBottom: 4 }}>Why this score</h4>
                    <p>{writingFeedback.justification}</p>
                  </div>
                )}
                {writingFeedback.fixes && writingFeedback.fixes.length > 0 && (
                  <div>
                    <h4 style={{ marginBottom: 4 }}>How to improve</h4>
                    <ul style={{ marginTop: 0 }}>
                      {writingFeedback.fixes.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
