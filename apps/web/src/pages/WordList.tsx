import { useEffect, useMemo, useState } from "react";
import { dictionaryLinks, openDictionary } from "../dictionary";
import { dueWords, getWordList, rateWord, removeWord, WORD_LIST_CHANGED_EVENT, type VocabEntry } from "../vocab";
import { INTERVALS_DAYS, MAX_LEVEL, type VocabRating } from "../vocabSchedule";
import { IconBook, IconExternal, IconTrash } from "../icons";
import { play, playScore } from "../sfx";
import { t } from "../i18n";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function LevelDots({ lvl }: { lvl: number }) {
  return (
    <span className="level-dots" title={t("Level {lvl}/{max} — every {n} day(s)", { lvl, max: MAX_LEVEL, n: INTERVALS_DAYS[lvl] ?? 0 })} aria-label={t("Level {lvl} of {max}", { lvl, max: MAX_LEVEL })}>
      {Array.from({ length: MAX_LEVEL }, (_, i) => (
        <i key={i} className={i < lvl ? "on" : ""} aria-hidden="true" />
      ))}
    </span>
  );
}

function WordCard({ word, entry }: { word: string; entry: VocabEntry }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="word-card">
      <div className="word-card-head">
        <button className="word-card-word" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <IconBook size={15} aria-hidden="true" />
          {word}
          <LevelDots lvl={entry.lvl ?? 0} />
          <span className="muted small">{t("added {date}", { date: formatDate(entry.addedAt) })}</span>
        </button>
        <div className="row">
          <button className="btn btn-sm btn-ghost" onClick={() => { removeWord(word); play("clear"); }} title={t("Remove \"{word}\" from your list", { word })}>
            <IconTrash size={13} aria-hidden="true" />
            {t("Remove")}
          </button>
        </div>
      </div>
      {open && (
        <div className="word-card-body">
          <div className="dict-links">
            {dictionaryLinks(word).map((l) => (
              <button
                key={l.id}
                className="dict-link"
                onClick={() => openDictionary(l.url)}
                title={l.hint ?? l.url}
              >
                <IconExternal size={11} aria-hidden="true" />
                {l.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const RATINGS: { value: VocabRating; label: string; cls: string }[] = [
  { value: "forgot", label: "Forgot", cls: "btn" },
  { value: "almost", label: "Almost", cls: "btn" },
  { value: "knew", label: "Knew it", cls: "btn btn-primary" },
];

export default function WordList() {
  const [tick, setTick] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [queue, setQueue] = useState<string[]>([]);
  const [summary, setSummary] = useState<Record<VocabRating, number>>({ knew: 0, almost: 0, forgot: 0 });

  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener(WORD_LIST_CHANGED_EVENT, bump);
    return () => window.removeEventListener(WORD_LIST_CHANGED_EVENT, bump);
  }, []);

  const words = useMemo(() => {
    const list = getWordList();
    return Object.entries(list).sort((a, b) => b[1].addedAt.localeCompare(a[1].addedAt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const count = words.length;
  const due = useMemo(() => dueWords().length, [tick]);

  const startReview = () => {
    setQueue(shuffle(dueWords()));
    setSummary({ knew: 0, almost: 0, forgot: 0 });
    setReviewing(true);
  };

  const rate = (rating: VocabRating) => {
    const word = queue[0];
    if (!word) return;
    rateWord(word, rating);
    setSummary((s) => ({ ...s, [rating]: s[rating] + 1 }));
    play(rating === "knew" ? "correct" : rating === "almost" ? "pop" : "wrong");
    const rest = queue.slice(1);
    if (rating === "forgot") rest.push(word); // re-drill later in the same session
    setQueue(rest);
    if (rest.length === 0) playScore(100); // session finished — summary screen shows
  };

  const current = reviewing ? queue[0] : null;
  const total = queue.length;

  if (reviewing) {
    return (
      <div className="page">
        <div className="page-head">
          <h2>{t("Vocabulary review")}</h2>
          <span className="tag accent">{t("{n} left", { n: total })}</span>
        </div>
        <div className="card panel review-card">
          {current ? (
            <>
              <p className="hint" style={{ marginTop: 0 }}>{t("Do you know this word?")}</p>
              <h3 className="review-word">{current}</h3>
              <div className="row">
                <button className="btn btn-ghost" onClick={() => openDictionary(dictionaryLinks(current)[0]?.url ?? "")}>
                  <IconBook size={15} aria-hidden="true" />
                  {t("Look it up")}
                </button>
              </div>
              <div className="review-actions">
                {RATINGS.map((r) => (
                  <button key={r.value} className={r.cls} onClick={() => rate(r.value)}>
                    {t(r.label)}
                  </button>
                ))}
              </div>
              <button className="btn btn-sm btn-ghost" onClick={() => { setReviewing(false); setTick((t) => t + 1); }}>
                {t("End session")}
              </button>
            </>
          ) : (
            <div className="empty">
              <b>{t("Review complete")}</b>
              <p>
                {t("Knew it")}: <b>{summary.knew}</b> · {t("Almost")}: <b>{summary.almost}</b> · {t("Forgot")}: <b>{summary.forgot}</b>
              </p>
              <div className="row">
                <button className="btn btn-primary" onClick={() => { setReviewing(false); setTick((t) => t + 1); }}>{t("Back to list")}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <h2>{t("Word list")}</h2>
        {count > 0 && <span className="tag accent">{t("{n} saved", { n: count })}</span>}
      </div>
      {count === 0 ? (
        <div className="card panel">
          <div className="empty">
            <b>{t("No words saved yet")}</b>
            <p>
              {t("Select a word in any practice question and hit")} <b>{t("Dictionary")}</b>
              {t(", or tap a key-word chip, then press")}{" "}
              <b>+ {t("Add to word list")}</b>. {t("Saved words live only in your browser.")}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="card panel vocab-review">
            <div className="spread">
              <div>
                <b>{t("Spaced review")}</b>
                <p className="hint" style={{ margin: "2px 0 0" }}>
                  {due > 0
                    ? t("{n} word{s} due today — review drills them until you know them.", { n: due, s: due === 1 ? "" : "s" })
                    : t("All caught up. New words are due immediately, then every 1, 3, 7, 14, 30 days.")}
                </p>
              </div>
              <button className="btn btn-primary" onClick={startReview} disabled={due === 0}>
                {due === 0 ? t("All caught up") : t("Review {n}", { n: due })}
              </button>
            </div>
          </div>
          <div className="word-grid">
            {words.map(([word, entry]) => (
              <WordCard key={word} word={word} entry={entry} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}