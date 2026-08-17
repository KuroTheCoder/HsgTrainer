import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { tagStyle } from "./sections";

// Block-level markdown + Obsidian subset renderer for /notes.
// Deliberate subset (see docs/product-notes.md §8): headings, lists
// (incl. task lists), tables, code fences, blockquotes, callouts,
// wikilinks [[slug]] (internal), tags #tag (chips), embeds ![[x]] →
// link-out when the target is a note, else plain text. Raw HTML is never
// rendered — all text is React-escaped.
//
// `resolve` maps a wikilink target to a slug that exists (or null).

export interface NoteContext {
  resolve: (target: string) => string | null;
}

const INLINE_RE =
  /(!?)\[\[([^\]|]+)(?:\|([^\]]+))?\]\]|\[([^\]]+)\]\(([^)\s]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*\n]+)\*|(^|\s)#([A-Za-zÀ-ž0-9_\-/]+)/g;

function renderInline(text: string, ctx: NoteContext, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(INLINE_RE)) {
    const pre = text.slice(last, m.index);
    if (pre) out.push(pre);
    const [full, embed, target, alias, linkText, linkUrl, code, bold, italic, , tag] = m;
    const k = `${keyBase}-${i++}`;
    if (target) {
      const slug = ctx.resolve(target.trim());
      if (slug) {
        out.push(
          <Link key={k} to={`/notes/${slug}`} className="note-link">
            {alias?.trim() || target.trim()}
          </Link>,
        );
      } else if (embed) {
        // Embed of something not in the curated set → link-out nowhere; show source.
        out.push(<span key={k} className="note-embed-missing">{full}</span>);
      } else {
        out.push(<span key={k} className="note-missing-link">{full}</span>);
      }
    } else if (linkUrl) {
      if (/^(https?:|mailto:)/.test(linkUrl)) {
        out.push(
          <a key={k} href={linkUrl} target="_blank" rel="noreferrer" className="note-link">
            {linkText}
          </a>,
        );
      } else {
        out.push(<span key={k}>{full}</span>);
      }
    } else if (code) {
      out.push(<code key={k}>{code}</code>);
    } else if (bold) {
      out.push(<strong key={k}>{bold}</strong>);
    } else if (italic) {
      out.push(<em key={k}>{italic}</em>);
    } else if (tag) {
      out.push(
        <span key={k} className="note-tag" style={tagStyle(tag)}>
          #{tag}
        </span>,
      );
    }
    last = m.index! + full.length;
  }
  const rest = text.slice(last);
  if (rest) out.push(rest);
  return out;
}

interface Block {
  kind: "h1" | "h2" | "h3" | "p" | "ul" | "ol" | "task" | "table" | "code" | "quote" | "callout" | "hr";
  text?: string;
  items?: string[][];
  lang?: string;
  calloutType?: string;
}

/** Tokenize markdown into blocks (pure, testable — rendering is thin). */
export function tokenize(src: string): Block[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  const pushText = (kind: Block["kind"], text: string) => {
    if (!text.trim()) return;
    const last = blocks[blocks.length - 1];
    if (last?.kind === kind && kind === "p") {
      last.text = `${last.text}\n${text}`;
    } else {
      blocks.push({ kind, text });
    }
  };

  while (i < lines.length) {
    const line = lines[i]!;

    // code fence
    const fence = /^```(\w*)\s*$/.exec(line);
    if (fence) {
      const lang = fence[1] ?? "";
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i]!)) {
        buf.push(lines[i]!);
        i++;
      }
      i++;
      blocks.push({ kind: "code", text: buf.join("\n"), lang: lang || undefined });
      continue;
    }

    // frontmatter never reaches here (stripped by parseNote)
    // heading
    const h = /^(#{1,3})\s+(.+)$/.exec(line);
    if (h) {
      blocks.push({ kind: `h${h[1]!.length}` as Block["kind"], text: h[2]! });
      i++;
      continue;
    }

    // hr
    if (/^(\*\s*){3,}$|^(-{3,})$/.test(line.trim())) {
      blocks.push({ kind: "hr" });
      i++;
      continue;
    }

    // callout
    const call = /^>\s*\[!(note|tip|warning|danger|info|example|quote)\]\s*([^:]*)(?::)?\s*$/.exec(line);
    if (call) {
      const type = call[1]!.toLowerCase();
      const title = (call[2] ?? "").trim() || type;
      const buf: string[] = [];
      i++;
      while (i < lines.length) {
        const q = /^>\s?(.*)$/.exec(lines[i]!);
        if (!q || (q[1] ?? "").trimStart().startsWith("[!")) break;
        buf.push(q[1] ?? "");
        i++;
      }
      blocks.push({ kind: "callout", calloutType: type, text: buf.join("\n"), lang: title });
      continue;
    }

    // blockquote
    if (line.startsWith(">")) {
      const buf: string[] = [];
      while (i < lines.length && /^>/.test(lines[i]!)) {
        buf.push(lines[i]!.replace(/^>\s?/, ""));
        i++;
      }
      pushText("quote", buf.join("\n"));
      continue;
    }

    // table (header row + separator)
    if (/^\|.*\|$/.test(line) && i + 1 < lines.length && /^\|[\s:|-]+\|$/.test(lines[i + 1]!)) {
      const rows: string[][] = [];
      rows.push(splitRow(line));
      i += 2;
      while (i < lines.length && /^\|.*\|$/.test(lines[i]!)) {
        rows.push(splitRow(lines[i]!));
        i++;
      }
      blocks.push({ kind: "table", items: rows });
      continue;
    }

    // list: task / ul / ol
    const task = /^\s*[-*]\s+\[( |x|X)\]\s+(.+)$/.exec(line);
    const ul = /^\s*[-*]\s+(.+)$/.exec(line);
    const ol = /^\s*\d+\.\s+(.+)$/.exec(line);
    if (task || ul || ol) {
      const kind: Block["kind"] = task ? "task" : ul ? "ul" : "ol";
      const items: string[][] = [];
      const re = task ? /^\s*[-*]\s+\[( |x|X)\]\s+(.+)$/ : ul ? /^\s*[-*]\s+(.+)$/ : /^\s*\d+\.\s+(.+)$/;
      while (i < lines.length) {
        const m = re.exec(lines[i]!);
        if (!m) break;
        items.push(task ? [m[1]!, m[2]!] : [m[1]!]);
        i++;
      }
      blocks.push({ kind, items });
      continue;
    }

    // plain paragraph (accumulate consecutive non-empty lines)
    if (line.trim()) {
      const buf: string[] = [line];
      i++;
      while (i < lines.length && lines[i]!.trim() && !/^(#{1,3}\s|>\s|```|^\s*[-*]\s|\d+\.\s|\|)/.test(lines[i]!)) {
        buf.push(lines[i]!);
        i++;
      }
      pushText("p", buf.join("\n"));
      continue;
    }
    i++;
  }
  return blocks;
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

/** Render the tokenized blocks. */
export function renderBlocks(blocks: Block[], ctx: NoteContext): ReactNode[] {
  const out: ReactNode[] = [];
  let k = 0;
  for (const b of blocks) {
    const key = `b${k++}`;
    switch (b.kind) {
      case "h1":
        out.push(<h1 key={key}>{renderInline(b.text!, ctx, key)}</h1>);
        break;
      case "h2":
        out.push(<h2 key={key}>{renderInline(b.text!, ctx, key)}</h2>);
        break;
      case "h3":
        out.push(<h3 key={key}>{renderInline(b.text!, ctx, key)}</h3>);
        break;
      case "p":
        out.push(<p key={key}>{renderInline(b.text!, ctx, key)}</p>);
        break;
      case "quote":
        out.push(<blockquote key={key}>{renderInline(b.text!, ctx, key)}</blockquote>);
        break;
      case "hr":
        out.push(<hr key={key} />);
        break;
      case "callout":
        out.push(
          <div key={key} className={`note-callout note-callout-${b.calloutType ?? "note"}`}>
            <b>{b.lang}</b>
            {b.text ? renderInline(b.text, ctx, key) : null}
          </div>,
        );
        break;
      case "code":
        out.push(
          <pre key={key}>
            <code>{b.text}</code>
          </pre>,
        );
        break;
      case "ul":
      case "ol":
        out.push(
          b.kind === "ul" ? (
            <ul key={key}>
              {b.items!.map((it, j) => (
                <li key={j}>{renderInline(it[0]!, ctx, `${key}-${j}`)}</li>
              ))}
            </ul>
          ) : (
            <ol key={key}>
              {b.items!.map((it, j) => (
                <li key={j}>{renderInline(it[0]!, ctx, `${key}-${j}`)}</li>
              ))}
            </ol>
          ),
        );
        break;
      case "task":
        out.push(
          <ul key={key} className="note-tasks">
            {b.items!.map((it, j) => (
              <li key={j}>
                <input type="checkbox" checked={it[0] === "x" || it[0] === "X"} disabled tabIndex={-1} aria-hidden="true" />
                {renderInline(it[1]!, ctx, `${key}-${j}`)}
              </li>
            ))}
          </ul>,
        );
        break;
      case "table":
        out.push(
          <div key={key} className="note-table-wrap">
            <table className="note-table">
              <tbody>
                {b.items!.map((row, j) => (
                  <tr key={j}>
                    {row.map((cell, c) =>
                      j === 0 ? (
                        <th key={c} scope="col">
                          {renderInline(cell, ctx, `${key}-${j}-${c}`)}
                        </th>
                      ) : (
                        <td key={c}>{renderInline(cell, ctx, `${key}-${j}-${c}`)}</td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
        break;
    }
  }
  return out;
}

/** Convenience: full pipeline for one note body. */
export function renderNote(body: string, ctx: NoteContext): ReactNode[] {
  return renderBlocks(tokenize(body), ctx);
}