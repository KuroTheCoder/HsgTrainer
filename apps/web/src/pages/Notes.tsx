import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { loadNote, loadNoteMetas, type Note, type NoteMeta } from "../notes";
import { renderNote, type NoteContext } from "../notes-md";
import { tagStyle } from "../sections";
import { IconDoc } from "../icons";
import { t } from "../i18n";

export default function Notes() {
  const { slug } = useParams();
  const [metas, setMetas] = useState<NoteMeta[] | null>(null);
  const [current, setCurrent] = useState<Note | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // "/" focuses the notes search (global shortcuts are disabled while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let alive = true;
      loadNoteMetas()
      .then((m) => alive && setMetas(m))
      .catch((e) => alive && setError(e instanceof Error ? e.message : t("notes unavailable")));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!slug) {
      setCurrent(null);
      setError(null);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    loadNote(slug)
      .then((n) => {
        if (alive) {
          setCurrent(n);
          document.title = `${n.title} · Notes · HsgTrainer`;
        }
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : t("note unavailable")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [slug]);

  const ctx: NoteContext = useMemo(
    () => ({ resolve: (t) => (metas?.some((m) => m.slug === t) ? t : null) }),
    [metas],
  );

  const backlinks = useMemo(
    () => (current && metas ? (metas.find((m) => m.slug === current.slug)?.backlinks ?? []).map((s) => metas.find((m) => m.slug === s)).filter((m): m is NoteMeta => !!m) : []),
    [current, metas],
  );

  const list = useMemo(() => {
    if (!metas) return [];
    const q = query.trim().toLowerCase();
    return q ? metas.filter((m) => `${m.title} ${m.tags.join(" ")}`.toLowerCase().includes(q)) : metas;
  }, [metas, query]);

  if (error && !metas) {
    return (
      <div className="page">
        <div className="banner error" role="alert">
          {error}
        </div>
      </div>
    );
  }

  if (!metas || metas.length === 0) {
    return (
      <div className="page">
        <div className="card empty">
          <b>{metas ? t("No notes yet") : t("Loading notes…")}</b>
          <p>
            {metas
              ? t("Drop markdown files into content/notes/ and restart the dev server.")
              : t("Fetching the notes manifest…")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page notes-page">
      {current ? (
        <>
          <div className="notes-list">
            <div className="notes-list-head">
              <h2>
                <IconDoc size={16} aria-hidden="true" /> {t("Notes")}
              </h2>
              <input
                ref={searchRef}
                type="search"
                placeholder={t("Search notes…")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label={t("Search notes")}
              />
            </div>
            <nav aria-label={t("Notes")} className="notes-nav">
              {list.map((m) => (
                <Link key={m.slug} to={`/notes/${m.slug}`} className={m.slug === current.slug ? "active" : ""}>
                  {m.title}
                </Link>
              ))}
              {list.length === 0 && <span className="muted small">{t("No notes match “{q}”.", { q: query })}</span>}
            </nav>
          </div>
          <article className="card panel note-reader">
            {loading ? (
              <p className="muted">{t("Loading note…")}</p>
            ) : error ? (
              <div className="banner error" role="alert">
                {error}
              </div>
            ) : (
              <>
                <header className="note-head">
                  <h1>{current.title}</h1>
                  {current.tags.length > 0 && (
                    <div className="chip-row">
                      {current.tags.map((t) => (
                        <span key={t} className="tag" style={tagStyle(t)}>
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </header>
                <div className="note-prose">{renderNote(current.body, ctx)}</div>
                {backlinks.length > 0 && (
                  <footer className="note-backlinks">
                    <b>{t("Linked from")}</b>
                    <div className="chip-row">
                      {backlinks.map((m) => (
                        <Link key={m.slug} to={`/notes/${m.slug}`} className="chip-btn">
                          {m.title}
                        </Link>
                      ))}
                    </div>
                  </footer>
                )}
              </>
            )}
          </article>
        </>
      ) : (
        <div className="card panel note-reader">
          <header className="note-head">
            <h1>{t("Study notes")}</h1>
            <p className="muted">
              {t("Curated guides from the maintainer's vault — grammar, word formation, cloze technique and exam strategy, in a clean reading view. Pick a note on the left.")}
            </p>
          </header>
          <ul className="notes-index-list">
            {metas.map((m) => (
              <li key={m.slug}>
                <Link to={`/notes/${m.slug}`}>{m.title}</Link>
                {m.tags.slice(0, 3).map((t) => (
                  <span key={t} className="tag" style={tagStyle(t)}>
                    #{t}
                  </span>
                ))}
              </li>
            ))}
          </ul>
          <div className="card panel vault-card">
            <h3>{t("Take the notes to Obsidian")}</h3>
            <p className="muted">
              {t("Prefer your own reader? Download the whole vault — the same notes plus a minimal Obsidian setup — and open the folder in the free Obsidian app. Full graph view, backlinks, and your own themes and plugins work there.")}
            </p>
            <a className="btn btn-primary" href="/notes/hsgtrainer-vault.zip" download>
              {t("Download vault (.zip)")}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}