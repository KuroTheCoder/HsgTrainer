import { useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { renderMarkdown } from "../md";
import { addHighlight, getHighlights, getNote, removeHighlight, saveNote, type Note } from "../reader";
import { IconPen } from "../icons";

interface ToolbarState {
  x: number;
  y: number;
  text: string;
}

/** Trim leading quotes/brackets and trailing punctuation/whitespace off a selection range. */
function trimSelection(range: Range): void {
  const raw = range.toString();
  const leading = raw.match(/^[\s"'([{\u2018\u201C]*/)?.[0].length ?? 0;
  const trailing = raw.match(/[\s.,;:!?…'")\]}]\u2019\u201D-]+$/)?.[0].length ?? 0;
  if (leading === 0 && trailing === 0) return;
  if (range.startContainer instanceof Text) {
    range.setStart(range.startContainer, Math.min(range.startOffset + leading, range.startContainer.data.length));
  }
  if (range.endContainer instanceof Text) {
    range.setEnd(range.endContainer, Math.max(range.endOffset - trailing, range.startOffset));
  }
}

export function Reader({
  questionId,
  text,
  className,
  onLookup,
}: {
  questionId: number;
  text: string;
  className?: string;
  onLookup?: (word: string, x: number, y: number) => void;
}) {
  const wrapRef = useRef<HTMLParagraphElement>(null);
  const [toolbar, setToolbar] = useState<ToolbarState | null>(null);
  const [highlights, setHighlights] = useState<string[]>(() => getHighlights(questionId));

  const dismiss = useCallback(() => {
    setToolbar(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  const onMouseUp = useCallback(() => {
    const wrap = wrapRef.current;
    const sel = window.getSelection();
    if (!wrap) return;
    if (sel && wrap.contains(sel.anchorNode) && !sel.isCollapsed && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      trimSelection(range);
      const text = range.toString().trim();
      if (text.length < 2 || text.length > 300) {
        setToolbar(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      setToolbar({ x: rect.left + rect.width / 2, y: rect.top, text });
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

  const highlight = () => {
    if (!toolbar) return;
    addHighlight(questionId, toolbar.text);
    setHighlights(getHighlights(questionId));
    dismiss();
  };

  const unhighlight = () => {
    if (!toolbar) return;
    removeHighlight(questionId, toolbar.text);
    setHighlights(getHighlights(questionId));
    dismiss();
  };

  // The toolbar renders inside the question card, but its coordinates are
  // viewport-space (from the selection rect). Portal it to <body> and use
  // document-space absolute positioning so it stays glued to the word as the
  // page scrolls (and a positioned ancestor can't offset it).
  const toolbarEl =
    toolbar &&
    createPortal(
      <span
        className="reader-toolbar"
        style={{ left: toolbar.x + window.scrollX, top: toolbar.y + window.scrollY }}
        role="toolbar"
        aria-label="Text tools"
      >
        {onLookup && (
          <button onClick={() => onLookup(toolbar.text, toolbar.x, toolbar.y)} title="Look up in dictionary">
            Dictionary
          </button>
        )}
        {highlights.includes(toolbar.text) ? (
          <button onClick={unhighlight} title="Remove this highlight">
            Unhighlight
          </button>
        ) : (
          <button onClick={highlight} title="Save as highlight">
            Highlight
          </button>
        )}
      </span>,
      document.body,
    );

  return (
    <p ref={wrapRef} className={className} onMouseUp={onMouseUp}>
      {renderMarkdown(text, highlights)}
      {toolbarEl}
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
