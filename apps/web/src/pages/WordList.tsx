import { useEffect, useMemo, useState } from "react";
import { dictionaryLinks, openDictionary } from "../dictionary";
import { getWordList, removeWord, WORD_LIST_CHANGED_EVENT, type VocabEntry } from "../vocab";
import { IconBook, IconExternal, IconTrash } from "../icons";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

function WordCard({ word, entry }: { word: string; entry: VocabEntry }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="word-card">
      <div className="word-card-head">
        <button className="word-card-word" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <IconBook size={15} aria-hidden="true" />
          {word}
          <span className="muted small">added {formatDate(entry.addedAt)}</span>
        </button>
        <div className="row">
          <button className="btn btn-sm btn-ghost" onClick={() => removeWord(word)} title={`Remove "${word}" from your list`}>
            <IconTrash size={13} aria-hidden="true" />
            Remove
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

export default function WordList() {
  const [tick, setTick] = useState(0);

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

  return (
    <div className="page">
      <div className="page-head">
        <h2>Word list</h2>
        {count > 0 && <span className="tag accent">{count} saved</span>}
      </div>
      {count === 0 ? (
        <div className="card panel">
          <div className="empty">
            <b>No words saved yet</b>
            <p>
              Select a word in any practice question and hit <b>Dictionary</b>, or tap a key-word chip, then press{" "}
              <b>+ Add to word list</b>. Saved words live only in your browser.
            </p>
          </div>
        </div>
      ) : (
        <div className="word-grid">
          {words.map(([word, entry]) => (
            <WordCard key={word} word={word} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
