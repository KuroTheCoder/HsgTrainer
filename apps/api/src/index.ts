import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./env";
import practice from "./routes/practice";
import writing from "./routes/writing";
import contribute from "./routes/contribute";
import admin from "./routes/admin";

const app = new Hono<{ Bindings: Env }>();

app.use(
  "/api/*",
  cors({
    origin: (origin, c) => {
      const env = c.env as Env;
      if (!origin) return "*";
      const allowed = (env.ALLOWED_ORIGINS ?? "http://localhost:5173")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      return allowed.includes(origin) ? origin : null;
    },
    allowHeaders: ["Content-Type", "Authorization", "X-Anon-Id"],
    allowMethods: ["GET", "POST", "PATCH", "OPTIONS"],
  }),
);

app.get("/api/health", (c) => c.json({ ok: true }));

app.route("/api", practice);
app.route("/api/writing", writing);
app.route("/api/contribute", contribute);
app.route("/api/admin", admin);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "internal error" }, 500);
});

app.notFound((c) => c.json({ error: "not found" }, 404));

export default app;
