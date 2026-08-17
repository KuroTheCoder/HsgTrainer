# Product Notes — Parking Lot

Ideas and observations from the maintainer, captured so they are never lost. **No scoping here** — each entry is the idea as spoken plus a one-line seed of what "done" looks like. Revisit when the next phase is planned (2026-08-16, post theming/sfx/slider/debug/tag work).

---

## 1. Page-by-page redesign — ultimate UX/UI

Redesign the contents of every page and the feature set each page carries. Make each page easy to use and intuitive on first visit — the ultimate UX; the UI should get the same care.

- **Done looks like:** a per-page audit (purpose → features → first-run friction) driving a redesign pass page by page.

## 2. Theme polish — there is always room

- Smoother **transitions between themes** (currently instant token swaps, no crossfade between palettes).
- **More color palettes**, **more customizations** on top of the existing 12 palettes / custom color / 6 backgrounds / intensity / presets / share links.

- **Done looks like:** a design-token expansion pass + animated theme switch (guarded by reduced-motion).

## 3. Storage strategy — stay costless

Keep the $0 running cost as usage and data grow. Smarter storage strategy: what lives in the browser (localStorage/IndexedDB) vs D1; aggregate reads, no per-event rows.

- **Done looks like:** a periodic review pass against the roadmap's storage rule (preferences/drafts/caches → browser; survival/analytics → D1), executed whenever storage-adjacent features land.

## 4. Guided training path — not a toolbox

The product must teach the **right way to train**, not bundle tools and say "go score high". A first-time user (even a 5-year-old) should immediately get what is going on and start learning and grinding: start → practice → review mistakes → improve, as one obvious path.

- **Done looks like:** an onboarding/first-run flow and a clear primary journey on Home, with tools as secondary paths behind it.

## 5. Contribution UX — question creation must be human-easy

Making/importing questions is hard even for developers today (forms, validation, variants, bulk CSV). End users will never manage it. Needs a dramatically simpler contribution experience.

- **Done looks like:** a guided wizard (live preview, inline validation, variant editing without CSV) that a motivated student can use, keeping the unverified→verified trust gate intact.

---

## 6. Listening section — missing exam skill

The product has **no listening support at all**: sections are only `phonetics | lexico-grammar | word-formation | cloze | reading | writing`, no audio question type, no audio field in the content schema. Real HSG tỉnh/thành phố exams (grade 9/11) include a listening part, so this is a genuine gap, not a deliberate omission.

- **Status (2026-08-16): basics shipped.** `listening` section + optional `audio` column (mcq scoring reused), player in practice/exam/review, audio field in admin/contribute/CSV import, demo listening questions in the sample bank, clips as static mp3s in `apps/web/public/audio/` ($0 cost).
- **Still to do:** real tỉnh/thành phố papers with listening keyed as `verified` (needs the actual audio files), contributed audio upload into R2 (10GB free), replay limits for exam fidelity.

---

## 7. Local-first grind + premium sync — the monetization path

**Decision (2026-08-17): the app goes local-first.** All grind data (sessions, answers, mistake ledger, progress) moves to the browser (IndexedDB); D1 serves only question banks, AI writing scoring, reports, admin. Sync is deliberately NOT built — users "just need a place to grind". Backup = one exported JSON save file + a short guide (put it in a Google Drive / iCloud / OneDrive folder; the OS syncs it free).

- **Funding link (wanted ASAP):** set up a Ko-fi/BuyMeACoffee-style link and put it on the site (footer + settings). "If they wanna sync without headache, money talks" — painless server-side sync is the natural **premium** tier once the funding path exists.
- **Pack distribution (refined 2026-08-17):** question packs are NOT served by or linked from the app's runtime — Drive is a plain download link, users grab the pack file manually and import it into the app (file picker → local storage). No Drive API, no OAuth, no ToS issues; the pack lives on the user's device. Later (only if traction), a native app can auto-scan the download folder for packs after a download — trivial on desktop, harder on phones (file mobility), so phone UX stays manual import.
- **Done looks like:** export/import save file + backup guide; a funding link live; (later, only if traction) a paid "cloud sync" tier.
- **Status (2026-08-17):** in progress. First slice: shared `packages/scoring` (done) + IndexedDB store + export/import, then Mistakes/Progress/Home data sources.

## 8. Obsidian vault → in-app study notes viewer

The maintainer has well-documented Obsidian vaults and wants to share them with users. Obsidian is an Electron app — a "native" viewer means rebuilding it; but Obsidian's core is markdown + a few syntax extensions, so a **curated renderer is cheap** and zero-dep (extend the hand-rolled `apps/web/src/md.tsx` from inline-only to block-level + Obsidian syntax).

- **Scope:** headings, lists, tables, code fences, blockquotes, **wikilinks** `[[Page]]` → internal navigation, **tags** `#tag` → chips, **callouts** `> [!note]` (unknown `[!type]` degrades to note), **frontmatter** hidden, embeds `![[file]]` → link-out, **YouTube** (`![[url]]` / `[text](url)` / bare URL → lazy 16:9 `youtube-nocookie` iframe). NO graph view / canvas / plugins — tell users to open the vault in Obsidian for those.
- **Hosting (lazy path):** curated markdown-only subset committed as `content/notes/**/*.md`, served statically, rendered at a `/notes` page with a file sidebar. Attachments/images either committed or linked out. Full-vault hosting on R2 (10GB free) only if the curated subset proves too small.
- **Done looks like:** `/notes` page rendering the maintainer's curated vault subset with wikilink navigation; backup/sync still via the save file.
- **Status (2026-08-17):** **shipped (first vault).** `/notes` viewer: frontmatter (hidden, title/tags), headings, paragraphs, lists + task lists, tables, code fences, blockquotes, Obsidian callouts (`[!note/tip/warning/danger/info/example/quote]`), wikilinks `[[slug]]` → internal navigation (missing targets render as muted text), **backlinks** ("Linked from" section, computed in the sync script's manifest), `#tag` chips (reuse the app's tag palette), external links, embeds `![[x]]` → link-out only. Layout: sticky sidebar with search (title/tags) + reader capped at 66ch / 1.7 line-height; horizontal scrollable nav on mobile. Notes live in `content/notes/**/*.md`, synced to `apps/web/public/notes/` by `scripts/copy-notes.mjs` (predev/prebuild, manifest `notes.json`), fetched at runtime — static hosting, $0. **Vault download:** the sync script also zips `content/vault-template/` (.obsidian minimal config + README) + notes into `hsgtrainer-vault.zip` — the /notes landing offers "Download vault" so users can open the same notes in the real Obsidian app with their own themes/plugins. **Backup guide:** `content/notes/backup-guide.md` — detailed, low-tech-first export/import/FAQ guide rendered as a note, linked from Settings → Data, which also shows a "last export" reminder. Demo vault (index, word-formation, cloze-strategy, backup-guide) exercises every syntax feature; swap in real vault files anytime — no code changes needed. Deliberately out of scope (per plan): graph view, canvas, **porting Obsidian community plugins** (they are programs against Obsidian's API — not portable; the vault download covers that need: users run Obsidian locally with their full plugin/theme setups), theme import (CSS themes clash with the app's design language; a curated reader-style selector is the right variant).

---

## 9. Vietnamese i18n + keyboard-first workflows

Two maintainer asks shipped 2026-08-17.

- **Vietnamese i18n (one file to translate).** The maintainer translates the whole UI by editing a single file: `apps/web/src/i18n/vi.json` (English → Vietnamese pairs). UI strings *are* the English keys, so there is no en dictionary and code stays readable. Untranslated keys fall back to English, so the app never breaks mid-translation. Locale is persisted (`localStorage`) and auto-detected from `navigator.language`; switch lives at **Settings → Language** (EN/VI). `scripts/i18n-report.mjs` prints translation progress (scans `t("…")` calls vs `vi.json`) — run it to see what's left. **Done looks like:** maintainer fills `vi.json` to 100%; every page/component renders Vietnamese.
- **Keyboard-first (broken mouse).** Global: `g`-prefix nav (g+h/p/e/m/r/w/n/c/t/f/a/s → routes, g+1–7 → practice sections), `?` → shortcuts help overlay, `Esc` → close. Notes: `/` focuses search. **Admin review queue** (the daily grind): acts on the first item with **v**=verify / **r**=reject / **x**=details / **e**=edit / **s**=select — so a queue can be cleared without touching the mouse. All handlers ignore keystrokes while typing in a field. **Done looks like:** the maintainer clears the review queue and navigates the app with keyboard only.

---

## Reminders

- Surface these ideas to the maintainer at the start of every session (see AGENTS.md convention).
- Next planned discussion: the maintainer's **4-step plan** for the coming phase — revisit this file when that lands.