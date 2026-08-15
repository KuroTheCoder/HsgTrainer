import { useRef, useState, useEffect, useCallback } from "react";
import { renderMarkdown } from "../md";
import { lookupWord, type DictEntry } from "../dictionary";
import { addHighlight, getHighlights, getNote, saveNote, type Note } from "../reader";
import { IconX, IconPen, IconBook } from "../icons";

interface ToolbarState {
  x: number;
  y: number;
  text: string;
}

function toParentCoords(rect: DOMRect, parent: Element): { x: number; y: number } {
  const p = parent.getBoundingClientRect();
  return { x: rect.left - p.left, y: rect.top - p.top };
}

export function Reader({
  questionId,
  text,
  className,
}: {
  questionId: number;
  text: string;
  className?: string;
}) {
  const wrapRef = useRef<HTMLParagraphElement>(null);
  const [toolbar, setToolbar] = useState<ToolbarState | null>(null);
  const [dict, setDict] = useState<{ word: string; entry: DictEntry | null; loading: boolean } | null>(null);
  const [highlights, setHighlights] = useState<string[]>(() => getHighlights(questionId));

  const dismiss = useCallback(() => {
    setToolbar(null);
    setDict(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  const onMouseUp = useCallback(() => {
    const wrap = wrapRef.current;
    const sel = window.getSelection();
    if (!wrap) return;
    if (sel && wrap.contains(sel.anchorNode) && !sel.isCollapsed && sel.rangeCount > 0) {
      const text = sel.toString().trim();
      if (text.length < 2 || text.length > 300) {
        setToolbar(null);
        return;
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      const pos = toParentCoords(rect, wrap.offsetParent ?? wrap);
      setToolbar({ x: pos.x + rect.width / 2, y: pos.y, text });
    } else {
      setToolbar(null);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, [onMouseUp]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dismiss]);

  const lookup = async (word: string) => {
    setDict({ word, entry: null, loading: true });
    const entry = await lookupWord(word);
    setDict({ word, entry, loading: false });
  };

  const highlight = () => {
    if (!toolbar) return;
    addHighlight(questionId, toolbar.text);
    setHighlights(getHighlights(questionId));
    dismiss();
  };

  return (
    <p ref={wrapRef} className={className} onMouseUp={onMouseUp}>
      {renderMarkdown(text, highlights)}
      {toolbar && (
        <span className="reader-toolbar" style={{ left: toolbar.x, top: toolbar.y }} role="toolbar" aria-label="Text tools">
          <button onClick={() => void lookup(toolbar.text)} title="Look up in dictionary">
            <IconBook size={14} /> Dictionary
          </button>
          <button onClick={highlight} title="Save as highlight">
            Highlight
          </button>
        </span>
      )}
      {dict && (
        <span className="dict-pop" style={{ left: toolbar?.x ?? 0, top: (toolbar?.y ?? 0) + 6 }} role="dialog" aria-label={`Dictionary: ${dict.word}`}>
          <button className="dict-close" onClick={dismiss} aria-label="Close dictionary">
            <IconX size={13} />
          </button>
          {dict.loading && <em>Looking up “{dict.word}”…</em>}
          {!dict.loading && !dict.entry && <em>No entry found for “{dict.word}”.</em>}
          {!dict.loading && dict.entry && (
            <>
              <b className="dict-word">
                {dict.entry.word}
                {dict.entry.phonetic && <span> {dict.entry.phonetic}</span>}
              </b>
              <ul className="dict-list">
                {dict.entry.meanings.map((m, i) => (
                  <li key={i}>
                    {m.partOfSpeech && <i>{m.partOfSpeech}.</i>} {m.definition}
                    {m.example && <em className="dict-example">“{m.example}”</em>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </span>
      )}
    </p>
  );
}

export function NoteBox({
  questionId,
  section,
  label,
}: {
  questionId: number;
  section: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<Note | undefined>(() => getNote(questionId));
  const [draft, setDraft] = useState(note?.text ?? "");

  const commit = () => {
    saveNote(questionId, section, draft);
    setNote(getNote(questionId));
  };

  return (
    <span className="notebox">
      <button
        className={`btn btn-sm btn-ghost ${note ? "has-note" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title={note ? "Edit note" : "Add a note"}
      >
        <IconPen size={13} />
        {label}
        {note && <span className="note-dot" aria-hidden="true" />}
      </button>
      {open && (
        <div className="note-editor">
          <textarea
            rows={3}
            placeholder="Jot a note for this question…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label={`Note for question ${questionId}`}
          />
          <div className="row">
            <button className="btn btn-sm btn-primary" onClick={commit} disabled={!draft.trim()}>
              Save note
            </button>
            {note && (
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  setDraft("");
                  saveNote(questionId, section, "");
                  setNote(undefined);
                }}
              >
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </span>
  );
}
