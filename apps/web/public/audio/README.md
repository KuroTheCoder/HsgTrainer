# /audio — listening question clips

Drop mp3 files here for listening questions. Files are served as static assets
by Cloudflare Pages — **$0 cost** (no R2 needed for built-in content).

Conventions:

- Name files descriptively: `demo-listening-1.mp3`, `quoc-gia-2023-part1.mp3`
- Reference a clip from a question with the exact path: `"audio": "/audio/demo-listening-1.mp3"`
- Keep files small: mono 64–96 kbps mp3 is plenty for speech (~1 MB per minute)
- Missing files are not an error — the player renders "audio unavailable" so
  content can be keyed before audio exists
- If a contributed audio upload pipeline lands later, uploads go to R2
  (10 GB free) — see `docs/roadmap.md` storage notes

Question paths come from the database `questions.audio` column; practice and
exam pages render a player for any question that has one.