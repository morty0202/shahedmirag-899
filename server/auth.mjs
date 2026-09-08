/**
 * Signaling-server auth: PBKDF2 user store + HMAC-SHA256 tickets (JWT-compatible).
 *
 * Identity (userId / name / role) is minted here and verified on every
 * WebSocket upgrade — the client never gets to declare its own role.
 */

import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const SECRET = process.env.SIGNAL_SECRET || "";
export const TICKET_TTL_SEC = 12 * 60 * 60; // 12h

if (!SECRET) {
  if (process.env.NODE_ENV === "production") {
    console.error("[auth] SIGNAL_SECRET is required in production");
    process.exit(1);
  }
  console.warn("[auth] SIGNAL_SECRET not set — using an ephemeral dev secret (tickets reset on restart)");
}

const effectiveSecret = SECRET || "dev-ephemeral-secret";

/* ---------------- PBKDF2 password hashing (same format as the app) ---------------- */

export function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, 120_000, 32, "sha256");
  const hex = (b) => Buffer.from(b).toString("hex");
  return `pbkdf2$120000$${hex(salt)}$${hex(hash)}`;
}

export function verifyPassword(password, stored) {
  const [scheme, , saltHex, hashHex] = stored.split("$");
  if (scheme !== "pbkdf2") return false;
  const calc = pbkdf2Sync(password, Buffer.from(saltHex, "hex"), 120_000, 32, "sha256");
  const expected = Buffer.from(hashHex, "hex");
  return calc.length === expected.length && timingSafeEqual(calc, expected);
}

/* ---------------- user store (users.json) ---------------- */

const USERS_FILE = join(__dirname, "users.json");

export function loadUsers() {
  if (!existsSync(USERS_FILE)) return {};
  try {
    return JSON.parse(readFileSync(USERS_FILE, "utf8"));
  } catch {
    return {};
  }
}

export function saveUsers(users) {
  writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

export function authenticate(username, password) {
  const users = loadUsers();
  const entry = users[String(username || "").trim().toLowerCase()];
  if (!entry) return null;
  if (!verifyPassword(password || "", entry.hash)) return null;
  return { userId: entry.userId, name: entry.name, role: entry.role };
}

/* ---------------- tickets (compact JWS, HS256) ---------------- */

const b64url = (buf) => Buffer.from(buf).toString("base64url");

export function issueTicket({ userId, name, role }) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({ sub: userId, name, role, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + TICKET_TTL_SEC })
  );
  const sig = createHmac("sha256", effectiveSecret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${sig}`;
}

export function verifyTicket(token) {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, sig] = parts;
  const expected = createHmac("sha256", effectiveSecret).update(`${header}.${payload}`).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof claims.exp !== "number" || claims.exp * 1000 < Date.now()) return null;
    return claims; // { sub, name, role }
  } catch {
    return null;
  }
}
