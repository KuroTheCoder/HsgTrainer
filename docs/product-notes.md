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

- **Done looks like:** a `listening` section (new question type, e.g. audio-mcq: play a clip → answer), audio assets shipped as static mp3s in the web bundle (Cloudflare Pages serves them free — $0 cost preserved), contributed listening questions with audio upload via the API into R2 (10GB free), and at least one real tỉnh/thành phố paper with listening keyed as `verified`.

---

## Reminders

- Surface these ideas to the maintainer at the start of every session (see AGENTS.md convention).
- Next planned discussion: the maintainer's **4-step plan** for the coming phase — revisit this file when that lands.