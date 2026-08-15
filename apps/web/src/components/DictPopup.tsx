import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { dictionaryLinks, lookupWord, openDictionaryWindow, type DictEntry } from "../dictionary";
import { addWord, hasWord } from "../vocab";
import { IconBook, IconExternal, IconX } from "../icons";

export interface DictRequest {
  word: string;
  x: number;
  y: number;
}

/** Floating dictionary popup (portaled to body so ancestor transforms can't
 *  trap it). Shows the built-in quick definition, an "add to word list" toggle
 *  and deep links to real dictionaries in a mini window. */
export default function DictPopup({ word, x, y, onClose }: DictRequest & { onClose: () => void }) {
  const [entry, setEntry] = useState<DictEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [fallingBack, setFallingBack] = useState(false);
  const [saved, setSaved] = useState(() => hasWord(word));
  const closeRef = useRef<HTMLButtonElement>(null);
  const fallbackForRef = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setEntry(null);
    setFallingBack(false);
    void lookupWord(word).then((e) => {
      if (!alive) return;
      setEntry(e);
      setLoading(false);
      // Miss: auto-jump to a real dictionary instead of dead-ending.
      if (!e && fallbackForRef.current !== word) {
        fallbackForRef.current = word;
        setFallingBack(true);
        const first = dictionaryLinks(word)[0];
        if (first) openDictionaryWindow(first.url);
      }
    });
    return () => {
      alive = false;
    };
  }, [word]);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  const left = Math.max(8, Math.min(x, window.innerWidth - 336));
  const top = Math.max(8, Math.min(y, window.innerHeight - 140));

  const toggleSave = () => {
    if (saved) return;
    addWord(word);
    setSaved(true);
  };

  return createPortal(
    <div className="dict-pop" style={{ left, top }} role="dialog" aria-label={`Dictionary: ${word}`} aria-busy={loading}>
      <button ref={closeRef} className="dict-close" onClick={onClose} aria-label="Close dictionary">
        <IconX size={13} />
      </button>
      <b className="dict-word">
        <IconBook size={14} aria-hidden="true" />
        {word}
        {entry?.phonetic && <span> {entry.phonetic}</span>}
      </b>
      {loading && (
        <div className="dict-skeleton" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      )}
      {!loading && !entry && fallingBack && (
        <em>
          No quick entry found — opening {dictionaryLinks(word)[0]?.name ?? "a dictionary"}…
        </em>
      )}
      {!loading && !entry && !fallingBack && <em>No quick entry found for “{word}”.</em>}
      {!loading && entry && (
        <ul className="dict-list">
          {entry.meanings.map((m, i) => (
            <li key={i}>
              {m.partOfSpeech && <i>{m.partOfSpeech}.</i>} {m.definition}
              {m.example && <em className="dict-example">“{m.example}”</em>}
            </li>
          ))}
        </ul>
      )}
      <div className="dict-foot">
        <button
          className={`btn btn-sm ${saved ? "btn-ghost" : "btn-primary"}`}
          onClick={toggleSave}
          disabled={saved}
        >
          {saved ? "In your word list" : "+ Add to word list"}
        </button>
        <span className="dict-links-label">See in dictionary</span>
        <div className="dict-links">
          {dictionaryLinks(word).map((l) => (
            <button
              key={l.name}
              className="dict-link"
              onClick={() => openDictionaryWindow(l.url)}
              title={l.hint ?? l.url}
            >
              <IconExternal size={11} aria-hidden="true" />
              {l.name}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
