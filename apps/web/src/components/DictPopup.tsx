import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { defaultDictUrl, dictionaryLinks, getDefaultDictId, openDictionary } from "../dictionary";
import { addWord, hasWord } from "../vocab";
import { IconBook, IconExternal, IconX } from "../icons";

export interface DictRequest {
  word: string;
  x: number;
  y: number;
}

/** Floating dictionary popup (portaled to body). It stays glued to the word:
 *  coordinates are document-space, so it scrolls with the text. A ribbon on
 *  its side opens the user's default dictionary in one click (new tab or
 *  small window, per the Settings choice), and the popup closes itself when
 *  the user stops interacting with it. */
export default function DictPopup({ word, x, y, onClose }: DictRequest & { onClose: () => void }) {
  const [saved, setSaved] = useState(() => hasWord(word));
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const links = dictionaryLinks(word);
  const defaultId = getDefaultDictId();
  const defaultName = links.find((l) => l.id === defaultId)?.name ?? "dictionary";

  // Auto-close when the user stops looking the word up: click anywhere else
  // (mousedown so the closing click can't leak into the page) or press Escape.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  const left = x + window.scrollX;
  const top = y + window.scrollY;
  const popupW = Math.min(360, window.innerWidth * 0.86);
  const ribbonOnLeft = left + popupW + 130 > window.innerWidth;

  const toggleSave = () => {
    if (saved) return;
    addWord(word);
    setSaved(true);
  };

  const openDefault = () => {
    const url = defaultDictUrl(word);
    if (url) openDictionary(url);
  };

  return createPortal(
    <div
      ref={ref}
      className="dict-pop"
      style={{ left, top }}
      role="dialog"
      aria-label={`Dictionary: ${word}`}
    >
      <button
        className={`dict-ribbon ${ribbonOnLeft ? "left" : "right"}`}
        onClick={openDefault}
        title={`Open in ${defaultName}`}
        aria-label={`Open in ${defaultName}`}
      >
        <IconBook size={12} aria-hidden="true" />
        <span className="dict-ribbon-name">{defaultName}</span>
        <IconExternal size={10} aria-hidden="true" />
      </button>
      <div className="dict-pop-body">
        <button ref={closeRef} className="dict-close" onClick={onClose} aria-label="Close dictionary">
          <IconX size={13} />
        </button>
        <b className="dict-word">
          <IconBook size={14} aria-hidden="true" />
          {word}
        </b>
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
            {links.map((l) => (
              <button
                key={l.id}
                className={`dict-link ${l.id === defaultId ? "is-default" : ""}`}
                onClick={() => openDictionary(l.url)}
                title={l.hint ?? l.url}
              >
                <IconExternal size={11} aria-hidden="true" />
                {l.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
