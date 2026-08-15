import { createMiddleware } from "hono/factory";
import type { Env } from "../env";
import { verifyAdminToken } from "../lib/auth";

export const adminAuth = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const auth = c.req.header("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || !(await verifyAdminToken(c.env, token))) {
    return c.json({ error: "unauthorized" }, 401);
  }
  await next();
});
