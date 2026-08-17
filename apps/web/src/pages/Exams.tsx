import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { api } from "../api";
import { cefrBand, sectionMeta, SECTIONS, tagStyle } from "../sections";
import { IconBolt, IconCheck, IconSparkle, IconX, SectionIcon } from "../icons";
import { ScoreRing } from "../components/ScoreRing";
import SnapSlider from "../components/SnapSlider";
import { NoteBox, Reader } from "../components/Reader";
import ReportBox from "../components/ReportBox";
import AudioPlayer from "../components/AudioPlayer";
import DictPopup, { type DictRequest } from "../components/DictPopup";
import { play, playScore } from "../sfx";
import { launchConfetti } from "../confetti";
import { renderMarkdown } from "../md";
import type { AnswerResult, CriterionScores, ExamSectionResult, Paper, Question, WritingFeedback, WritingQuestion } from "../types";

type Phase = "config" | "running" | "results" | "writing" | "writing-result";

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

const CRITERIA: { key: keyof CriterionScores; label: string }[] = [
  { key: "content", label: "Content" },
  { key: "organization", label: "Organization" },
  { key: "vocabulary", label: "Vocabulary" },
  { key: "grammar", label: "Grammar" },
];

export default function Exams() {
  const [phase, setPhase] = useState<Phase>("config");
  const [papers, setPapers] = useState<Paper[]>([]);
  const [paper, setPaper] = useState<Paper | null>(null);
  const [timeLimit, setTimeLimit] = useState(30);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [results, setResults] = useState<AnswerResult[] | null>(null);
  const [dict, setDict] = useState<DictRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  // exam timer
  const [left, setLeft] = useState(0);

  // writing stage state
  const [writingQ, setWritingQ] = useState<WritingQuestion | null>(null);
  const [writingResponse, setWritingResponse] = useState("");
  const [writingFeedback, setWritingFeedback] = useState<WritingFeedback | null>(null);

  // review-only replay of a finished exam (no timer, no score)
  const [reviewing, setReviewing] = useState(false);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  const DRAFT_KEY = "hsg-exam-draft";
  interface Draft {
    paper: Paper;
    questions: Question[];
    sessionId: number;
    answers: Record<number, string>;
    deadline: number;
    phase: "running" | "writing";
    writingQ: WritingQuestion | null;
    writingResponse: string;
    savedAt: number;
  }
  const [draft, setDraft] = useState<Draft | null>(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      const d = JSON.parse(raw) as Draft;
      return d && d.paper && d.sessionId ? d : null;
    } catch {
      return null; // private mode / corrupt draft
    }
  });

  const discardDraft = () => {
    setDraft(null);
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* private mode */
    }
  };

  const saveDraft = () => {
    if (phase !== "running" && phase !== "writing") return;
    if (reviewing || !paper || !sessionId) return;
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          paper,
          questions,
          sessionId,
          answers,
          deadline: deadlineRef.current,
          phase,
          writingQ,
          writingResponse,
          savedAt: Date.now(),
        } satisfies Draft),
      );
    } catch {
      /* private mode */
    }
  };

  useEffect(() => {
    saveDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, answers, writingResponse, questions, paper, sessionId, writingQ]);

  const resumeDraft = () => {
    if (!draft) return;
    setPaper(draft.paper);
    setQuestions(draft.questions);
    setSessionId(draft.sessionId);
    setAnswers(draft.answers);
    setWritingQ(draft.writingQ);
    setWritingResponse(draft.writingResponse);
    deadlineRef.current = draft.deadline;
    setLeft(Math.max(0, Math.round((draft.deadline - Date.now()) / 1000)));
    setReviewing(false);
    setPhase(draft.phase);
  };

  const loadPapers = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.getPapers();
      setPapers(res.papers);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void loadPapers();
  }, [loadPapers]);

  const start = async (p: Paper) => {
    setBusy(true);
    setError(null);
    discardDraft();
    try {
      const s = await api.startSession({ paperId: p.id });
      if (s.questions.length === 0) {
        setError("This paper has no answerable questions yet — the content team is keying papers.");
        return;
      }
      setPaper(p);
      setQuestions(s.questions);
      setSessionId(s.sessionId);
      setAnswers({});
      setResults(null);
      setReviewing(false);
      setRevealed({});
      deadlineRef.current = Date.now() + timeLimit * 60_000;
      setLeft(timeLimit * 60);
      setPhase("running");
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to start exam");
    } finally {
      setBusy(false);
    }
  };

  const answeredCount = useMemo(() => questions.filter((q) => answers[q.id]?.trim()).length, [questions, answers]);

  const finish = async (timedOut = false) => {
    if (!sessionId) return;
    const unanswered = questions.length - answeredCount;
    if (!timedOut && unanswered > 0 && !window.confirm(`Submit with ${unanswered} unanswered? They count as wrong.`)) return;
    setBusy(true);
    setError(null);
    try {
      const answered = questions
        .filter((q) => answers[q.id]?.trim())
        .map((q) => ({ questionId: q.id, response: answers[q.id] ?? "" }));
      const res = await api.submitAnswers(sessionId, answered);
      const byId = new Map(res.results.map((r) => [r.questionId, r]));
      const full: AnswerResult[] = questions.map((q) => {
        const r = byId.get(q.id);
        return (
          r ?? {
            questionId: q.id,
            yourAnswer: "",
            correct: false,
            expected: q.acceptedVariants[0] ?? "",
            explanation: null,
          }
        );
      });
      const pct = Math.round((full.filter((r) => r.correct).length / full.length) * 100);
      setResults(full);
      playScore(pct);
      if (pct >= 80) launchConfetti({ count: pct === 100 ? 220 : 140 });
      setPhase("results");
      discardDraft();
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to submit");
    } finally {
      setBusy(false);
    }
  };

  // Keep the latest finish available to the countdown timer (ref avoids a stale closure).
  const finishRef = useRef(finish);
  finishRef.current = finish;

  const deadlineRef = useRef(0);
  useEffect(() => {
    if (phase !== "running" || reviewing) return;
    const id = window.setInterval(() => {
      const rem = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000));
      setLeft(rem);
      if (rem === 300 || rem === 60) play("warn");
      if (rem === 0) {
        window.clearInterval(id);
        void finishRef.current(true);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  const drawWriting = async () => {
    if (!paper) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.paperWriting(paper.id);
      const q = res.questions[0];
      if (!q) {
        setError("No verified writing prompts for this paper yet.");
        return;
      }
      setWritingQ(q);
      setWritingResponse("");
      setWritingFeedback(null);
      setPhase("writing");
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to draw writing prompt");
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
      discardDraft();
    } catch (e) {
      setError(e instanceof Error ? e.message : "scoring failed");
    } finally {
      setBusy(false);
    }
  };

  const setAnswer = (id: number, value: string) => setAnswers((a) => ({ ...a, [id]: value }));
  const wordCount = useMemo(() => writingResponse.trim().split(/\s+/).filter(Boolean).length, [writingResponse]);

  const bySection = useMemo<ExamSectionResult[]>(() => {
    if (!results) return [];
    const map = new Map<string, { section: string; correct: number; answered: number }>();
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const r = results[i];
      if (!r) continue;
      const e = map.get(q.section) ?? { section: q.section, correct: 0, answered: 0 };
      e.answered += 1;
      if (r.correct) e.correct += 1;
      map.set(q.section, e);
    }
    return [...map.values()]
      .map((e) => ({ section: e.section as ExamSectionResult["section"], correct: e.correct, answered: e.answered }))
      .sort((a, b) => SECTIONS.findIndex((s) => s.key === a.section) - SECTIONS.findIndex((s) => s.key === b.section));
  }, [results, questions]);

  const scoreSummary = useMemo(() => {
    if (!results) return null;
    const correct = results.filter((r) => r.correct).length;
    return { correct, total: results.length, pct: Math.round((correct / results.length) * 100) };
  }, [results]);

  const ringTone = (pct: number) => (pct >= 80 ? "ok" : pct >= 60 ? "warn" : "bad") as "ok" | "warn" | "bad";
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="page">
      <div className="page-head">
        <h2>Mock exam</h2>
      </div>
      {dict && <DictPopup word={dict.word} x={dict.x} y={dict.y} onClose={() => setDict(null)} />}
      <span className="sr-only" role="status">
        {busy ? "Working, please wait" : ""}
      </span>

      {error && (
        <div className="banner error" role="alert">
          {error}
        </div>
      )}

      {phase === "config" && (
        <div className="card panel">
          {draft && (
            <div className="resume-banner">
              <div className="spread">
                <div>
                  <b>Exam in progress — {draft.paper.name}</b>
                  <p className="hint" style={{ margin: "2px 0 0" }}>
                    {draft.phase === "writing"
                      ? "Writing task saved."
                      : `Saved ${draft.savedAt > Date.now() - 60_000 ? "just now" : `${Math.round((Date.now() - draft.savedAt) / 60_000)} min ago`}.`}{" "}
                    Pick up where you left off.
                  </p>
                </div>
                <div className="row">
                  <button className="btn btn-primary" onClick={resumeDraft}>
                    Resume exam
                  </button>
                  <button className="btn btn-ghost" onClick={discardDraft}>
                    Discard
                  </button>
                </div>
              </div>
            </div>
          )}
          <h3>Time limit</h3>
          <SnapSlider
            min={5}
            max={60}
            step={1}
            value={timeLimit}
            onChange={setTimeLimit}
            snapPoints={[15, 30, 45, 60]}
            format={(v) => `${v} min`}
          />

          <h3 style={{ marginTop: 18 }}>Pick a paper</h3>
          {!busy && papers.length === 0 && (
            <p className="hint">
              No full papers available yet — verified official papers appear here once the content team keys them.
            </p>
          )}
          <div className="card-grid">
            {papers.map((p) => (
              <div key={p.id} className="card paper-card">
                <div className="spread">
                  <div>
                    <b>{p.name}</b>
                    <div className="muted small">
                      {[p.year ? String(p.year) : null, p.province, p.grade].filter(Boolean).join(" · ") || "Official paper"}
                    </div>
                    <div className="row-chips" style={{ marginTop: 8 }}>
                      {Object.entries(p.sections)
                        .filter(([, n]) => n > 0)
                        .map(([sec, n]) => {
                          const meta = sectionMeta(sec);
                          return (
                            <span key={sec} className="tag" style={tagStyle(sec)} title={meta?.label}>
                              <SectionIcon icon={meta?.icon ?? ""} size={11} /> {n} · {meta?.short ?? sec}
                            </span>
                          );
                        })}
                      <span className="tag accent">{p.total} total</span>
                    </div>
                  </div>
                  <button className="btn btn-primary" onClick={() => void start(p)} disabled={busy}>
                    <IconBolt size={14} />
                    Start exam
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {phase === "running" && paper && questions.length > 0 && (
        <>
          <div className="card panel" style={{ padding: "16px 20px" }}>
            <div className="spread">
              {reviewing ? (
                <>
                  <span className="tag accent">Review mode — no score</span>
                  <span className="muted small" style={{ flex: 1 }}>
                    Try each question again, then reveal the answer to self-check.
                  </span>
                  <button className="btn btn-ghost" onClick={() => setPhase("results")}>
                    Back to results
                  </button>
                </>
              ) : (
                <div className="row" style={{ flex: 1 }}>
                  <strong>{paper.name}</strong>
                  <span className={`timer-chip ${left <= 60 ? "bad" : ""}`} aria-live="polite">
                    {mm}:{ss}
                  </span>
                  <div className="progress-track" style={{ flex: 1 }}>
                    <div className="progress-fill" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
                  </div>
                  <span className="muted small">
                    {answeredCount}/{questions.length} answered
                  </span>
                </div>
              )}
              {!reviewing && (
                <button className="btn btn-primary" onClick={() => void finish()} disabled={busy || answeredCount === 0}>
                  {busy ? "Scoring…" : "Finish & submit"}
                </button>
              )}
            </div>
          </div>

          <div className="card panel">
            {questions.map((q, i) => {
              const meta = sectionMeta(q.section);
              return (
                <div key={q.id} className={`question ${answers[q.id]?.trim() ? "" : "unanswered"}`} style={{ "--i": i } as CSSProperties}>
                  <div className="question-head">
                    <span className="qnum">
                      <span className="qnum-icon">
                        <SectionIcon icon={meta?.icon ?? ""} size={15} />
                        {i + 1}.
                      </span>
                    </span>
                    <span className="tag accent">{meta?.short ?? q.section}</span>
                    <span className="tag" style={tagStyle(q.qtype)}>{q.qtype}</span>
                    <span className={`tag cefr ${cefrBand(q.difficulty)}`}>{q.difficulty}</span>
                    {!answers[q.id]?.trim() && <span className="tag bad">unanswered</span>}
                  </div>
                  <Reader questionId={q.id} text={q.prompt} className="prompt" onLookup={(w, x, y) => setDict({ word: w, x, y })} />
                  {q.audio && <AudioPlayer src={q.audio} />}
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
                    <ReportBox questionId={q.id} />
                    {reviewing && results && (
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => setRevealed((r) => ({ ...r, [q.id]: !r[q.id] }))}
                        aria-expanded={!!revealed[q.id]}
                      >
                        {revealed[q.id] ? "Hide answer" : "Reveal answer"}
                      </button>
                    )}
                  </div>
                  {reviewing && revealed[q.id] && results && (
                    <div className="reveal">
                      <p className="small">
                        Your exam answer: <b>{results[i]?.yourAnswer || "— (not answered)"}</b> — correct:{" "}
                        <b>{results[i]?.expected}</b>
                      </p>
                      {results[i]?.explanation && (
                        <p className="explanation">{renderMarkdown(results[i]!.explanation)}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {!reviewing && (
              <button
                className="btn btn-primary btn-lg btn-block"
                style={{ marginTop: 8 }}
                onClick={() => void finish()}
                disabled={busy || answeredCount === 0}
              >
                {busy ? "Scoring…" : `Finish & submit (${answeredCount}/${questions.length} answered)`}
              </button>
            )}
          </div>
        </>
      )}

      {phase === "results" && results && scoreSummary && paper && (
        <>
          <div className="card summary">
            <ScoreRing value={scoreSummary.correct} max={scoreSummary.total} tone={ringTone(scoreSummary.pct)} />
            <div
              className={`stamp ${ringTone(scoreSummary.pct)}`}
              aria-hidden="true"
            >
              {scoreSummary.pct >= 80 ? "A+" : scoreSummary.pct >= 60 ? "Keep going" : "Try again"}
            </div>
            <div className="summary-meta">
              <h3>{paper.name}</h3>
              <p className="muted">
                {scoreSummary.correct}/{scoreSummary.total} correct ({scoreSummary.pct}%). Wrong answers are saved to
                your mistake ledger.
              </p>
              <div className="row">
                <button className="btn btn-primary" onClick={() => setPhase("config")}>
                  Back to papers
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setAnswers({});
                    setRevealed({});
                    setReviewing(true);
                    setPhase("running");
                  }}
                  disabled={busy}
                >
                  Review again (no score)
                </button>
                {paper.writing > 0 && writingFeedback === null && (
                  <button className="btn btn-ghost" onClick={() => void drawWriting()} disabled={busy}>
                    <IconSparkle size={14} />
                    Writing task ({paper.writing})
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="card panel" style={{ marginBottom: 18 }}>
            <h3>By section</h3>
            <div className="section-bars">
              {bySection.map((s) => {
                const meta = sectionMeta(s.section);
                const acc = s.answered ? s.correct / s.answered : 0;
                return (
                  <div key={s.section} className="section-bar-row">
                    <span className="bar-label" title={meta?.label}>
                      <SectionIcon icon={meta?.icon ?? ""} size={14} />
                      {meta?.short ?? s.section}
                    </span>
                    <div className="bar">
                      <div className="bar-fill" style={{ width: `${Math.round(acc * 100)}%`, background: meta?.color ?? undefined }} />
                    </div>
                    <span className="bar-num">
                      {s.correct}/{s.answered} · {Math.round(acc * 100)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card-grid">
            {results.map((r, i) => {
              const q = questions[i];
              const meta = q ? sectionMeta(q.section) : undefined;
              return (
                <div key={r.questionId} className={`question ${r.correct ? "ok" : "wrong"}`} style={{ "--i": i } as CSSProperties}>
                  <div className="question-head">
                    <span className="qnum">
                      <span className="qnum-icon">{r.correct ? <IconCheck size={15} /> : <IconX size={15} />}</span>
                      {i + 1}.
                    </span>
                    <span className="tag accent">{meta?.short ?? ""}</span>
                    <span className={`tag ${r.correct ? "ok" : "bad"}`}>{r.correct ? "Correct" : "Wrong"}</span>
                  </div>
                  <p className="prompt">{q ? renderMarkdown(q.prompt) : ""}</p>
                  {q?.audio && <AudioPlayer src={q.audio} />}
                  <p className="small">
                    Your answer: <b>{r.yourAnswer || "— (not answered)"}</b>
                    {!r.correct && (
                      <>
                        {" "}
                        — correct: <b>{r.expected}</b>
                      </>
                    )}
                  </p>
                  {r.explanation && <p className="explanation">{renderMarkdown(r.explanation)}</p>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {phase === "writing" && writingQ && (
        <div className="card panel">
          <div className="spread" style={{ marginBottom: 8 }}>
            <strong>Writing task — {paper?.name}</strong>
            {remaining !== null && (
              <span className="muted small">AI credits: {remaining} left today</span>
            )}
          </div>
          <Reader questionId={writingQ.id} text={writingQ.prompt} className="prompt" onLookup={(w, x, y) => setDict({ word: w, x, y })} />
          <textarea
            rows={12}
            className="answer-input"
            placeholder="Write your essay here…"
            value={writingResponse}
            onChange={(e) => setWritingResponse(e.target.value)}
            aria-describedby="exam-writing-words"
          />
          <p className="hint" id="exam-writing-words" style={{ marginTop: 6 }}>
            ≈ {wordCount} words · Writing is AI-scored on the HSG rubric (3 feedback credits per day).
          </p>
          <button
            className="btn btn-primary btn-lg btn-block"
            style={{ marginTop: 14 }}
            onClick={() => void submitWriting()}
            disabled={busy || !writingResponse.trim()}
          >
            <IconSparkle size={17} />
            {busy ? "Scoring with AI…" : "Get AI feedback"}
          </button>
        </div>
      )}

      {phase === "writing-result" && writingQ && writingFeedback && (
        <div className="card panel">
          <div className="spread" style={{ marginBottom: 8 }}>
            <strong>Writing feedback</strong>
            <div className="row">
              {remaining !== null && <span className="muted small">{remaining} AI credits left today</span>}
              <button className="btn btn-primary btn-sm" onClick={() => setPhase("config")}>
                Back to papers
              </button>
            </div>
          </div>
          <p className="prompt" style={{ marginTop: 0 }}>{renderMarkdown(writingQ.prompt)}</p>
          <div className="row" style={{ marginBottom: 12 }}>
            <span className={`tag ${writingFeedback.status === "ok" ? "ok" : "warn"}`}>
              {writingFeedback.status === "ok" ? `Band ${writingFeedback.band ?? "—"} · ${writingFeedback.total ?? 0}/20` : "Feedback unavailable"}
            </span>
          </div>
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
      )}
    </div>
  );
}
