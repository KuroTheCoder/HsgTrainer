import type { Env } from "../env";

const TOKEN_TTL_SECONDS = 7 * 24 * 3600;

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function hmacSign(env: Env, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(env.ADMIN_TOKEN),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return toBase64Url(new Uint8Array(sig));
}

export interface AdminPayload {
  role: "admin";
  exp: number;
}

/** Stateless admin session token: base64url(payload).base64url(hmac). */
export async function issueAdminToken(env: Env): Promise<string> {
  const payload: AdminPayload = {
    role: "admin",
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  const body = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await hmacSign(env, body);
  return `${body}.${sig}`;
}

export async function verifyAdminToken(env: Env, token: string): Promise<AdminPayload | null> {
  const dot = token.indexOf(".");
  if (dot === -1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmacSign(env, body);
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as AdminPayload;
    if (payload.role !== "admin") return null;
    if (typeof payload.exp !== "number" || payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}
