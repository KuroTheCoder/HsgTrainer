# HsgTrainer — Operations

Local dev, secrets, quota guardrails, deploy.

## Local dev

```bash
npm install
npm run dev:api     # wrangler dev → :8787 (local D1 via .wrangler/state)
npm run dev:web     # Vite → :5173, /api proxied to :8787
```

Local D1: `wrangler d1 migrations apply hsg_trainer --local`.

## Secrets (never commit)

`apps/api/.dev.vars` (git-ignored):

```
ADMIN_TOKEN=change-me
AI_GEMINI_KEY=...
AI_GROQ_KEY=...      # optional
EXPLAIN_DAILY_CAP=100  # optional — max explanations generated per day
WRITE_DAILY_CAP=3      # optional — AI writing feedback per user per day
CONTRIBUTE_DAILY_CAP=5 # optional — public contributions per user per day
CF_ACCOUNT_ID=...    # optional — Workers AI last-resort provider
CF_API_TOKEN=...     # optional — Workers AI last-resort provider
```

Production: `wrangler secret put ADMIN_TOKEN` etc. The AI adapter degrades gracefully if no keys are set (returns a fallback response; writing scoring reports "unavailable").

## Quota guardrails (the $0 contract — see architecture.md)

1. Deterministic question types never call the AI.
2. Explanations: generate once per question, cache in D1 forever.
3. AI-scored submissions: **3 per user per day** (writing/transformation).
4. No per-event logging — session summaries only (stays under 100k D1 writes/day).
5. Adapter handles 429/5xx with backoff + provider fallback (Gemini → Groq → Workers AI).

## Privacy note

Free-tier Gemini may use prompts to improve Google products. The adapter's Groq fallback does not train on prompts. The site's privacy policy should disclose this; consider making Groq the primary for user-essay content if the audience objects.

## Deploy

```bash
npm run build                     # build all workspaces
cd apps/api && wrangler deploy    # worker (routes, D1 binding, secrets)
cd apps/web && wrangler pages deploy dist
```

Custom domain: add in Cloudflare dashboard; or keep `hsgtrainer.pages.dev`.

## Monitoring

- Cloudflare dashboard: worker analytics, D1 row/read-write meters, Workers AI neuron meter
- Cloudflare Web Analytics on the SPA
- Watch: Gemini 1,500 req/day, D1 100k writes/day, Pages 100k req/day

## Live demo over a quick tunnel (no deploy)

For pitching the platform without publishing anything (ideal for the co-op pitch):

```bash
# 1. Build and run both apps locally
npm run build
npm run dev:api          # wrangler dev → :8787 (local D1)
npm run dev:web          # Vite → :5173

# 2. Set a strong admin token for the demo (local only)
#    edit apps/api/.dev.vars → ADMIN_TOKEN=<random strong value>; restart dev:api

# 3. Point cloudflared at the web app
cloudflared tunnel --url http://localhost:5173
# → prints https://<random>.trycloudflare.com — open it with the viewer.
```

Demo runbook:

- The tunnel URL changes every run — fine for a pitch, never for a product link.
- Guests share one local D1 database, so practice sessions and mistakes interact across devices. Reset state with `wrangler d1 execute hsg_trainer --local --command "DELETE FROM answers; DELETE FROM sessions;"` between demo groups if needed.
- Everything runs on your machine: kill the terminals and the demo disappears. The tunnel stays up as long as both processes and `cloudflared` run.
- Do **not** commit `.dev.vars`; the demo admin panel is protected by the bearer token only — keep the token strong and unshared.
