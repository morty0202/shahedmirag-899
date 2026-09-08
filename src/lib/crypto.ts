/**
 * Password hashing with PBKDF2-SHA256 via WebCrypto.
 *
 * Note: in the production deployment hashing happens on the server.
 * This module powers the bundled mock backend so the demo stores the
 * same format a real API would return — never plaintext.
 */

const ITERATIONS = 120_000;
const KEY_LENGTH = 32;

const encoder = new TextEncoder();

function toHex(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

async function derive(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations: ITERATIONS, hash: "SHA-256" },
    key,
    KEY_LENGTH * 8
  );
}

/** Returns `pbkdf2$iterations$saltHex$hashHex`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt);
  return `pbkdf2$${ITERATIONS}$${toHex(salt)}$${toHex(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, , saltHex, hashHex] = stored.split("$");
  if (scheme !== "pbkdf2") return false;
  const hash = await derive(password, fromHex(saltHex));
  return toHex(hash) === hashHex;
}

/** Cryptographically random session token. */
export function generateToken(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}

/** 6-digit numeric reset code. */
export function generateResetCode(): string {
  return String(100000 + Math.floor(Math.random() * 900000));
}
