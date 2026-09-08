/**
 * localStorage-backed mock backend.
 *
 * Implements the AuthApi contract with real security mechanics for the demo:
 * PBKDF2-hashed passwords, expiry-checked session tokens, login lockout,
 * and timed password-reset codes. Replace `src/lib/api/index.ts` with a
 * REST adapter for production; every screen stays untouched.
 */

import { hashPassword, verifyPassword, generateToken, generateResetCode } from "../crypto";
import { passwordStrength } from "../validation";
import type { AuthApi, ApiResult, RegisterInput, Role, Session, User } from "./types";

const USERS_KEY = "sm_users_v1";
const SESSION_KEY = "sm_session_v1";
const RESET_KEY = "sm_reset_v1";

const REMEMBER_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
const SESSION_TTL = 12 * 60 * 60 * 1000; // 12 hours
const RESET_TTL = 10 * 60 * 1000; // 10 minutes
const LOCK_AFTER = 5;
const LOCK_MS = 2 * 60 * 1000; // 2 minutes

interface StoredUser extends User {
  passwordHash: string;
}

interface StoredReset {
  code: string;
  expiresAt: number;
}

const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));

function readUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]") as StoredUser[];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function readSession(): { token: string; userId: string; expiresAt: number; remember: boolean } | null {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null");
  } catch {
    return null;
  }
}

function publicUser(u: StoredUser): User {
  const { passwordHash: _ignored, ...rest } = u;
  return rest;
}

/* ---------------- seed demo accounts (first run only) ---------------- */

let seeded: Promise<void> | null = null;

function seed(): Promise<void> {
  if (seeded) return seeded;
  seeded = (async () => {
    if (readUsers().length > 0) return;
    const mk = async (
      role: Role,
      username: string,
      password: string,
      firstName: string,
      lastName: string,
      extra: Partial<StoredUser> = {}
    ): Promise<StoredUser> => ({
      id: crypto.randomUUID(),
      role,
      username,
      firstName,
      lastName,
      fatherName: extra.fatherName ?? "—",
      birthDate: extra.birthDate ?? { jy: 1388, jm: 7, jd: 12 },
      nationalId: extra.nationalId ?? "1234567890",
      phone: extra.phone ?? "09120000000",
      email: extra.email,
      avatar: extra.avatar,
      grade: extra.grade ?? "یازدهم",
      className: extra.className ?? "۱۱/۲",
      field: extra.field ?? "ریاضی",
      academicYear: "۱۴۰۴–۱۴۰۵",
      studentNumber: extra.studentNumber ?? "۴۰۳۱",
      createdAt: new Date().toISOString(),
      passwordHash: await hashPassword(password),
    });

    const users: StoredUser[] = [
      await mk("student", "amir", "Amir1404@", "امیر", "نجفی", {
        fatherName: "محمد",
        nationalId: "0012345678",
        phone: "09121234567",
        email: "amir@meraj.school",
        className: "261",
      }),
      await mk("teacher", "ahmadi", "Teacher1404@", "رضا", "احمدی", {
        grade: "—",
        className: "کلاس ریاضی",
        field: "ریاضی",
        studentNumber: "۲۰۰۱",
      }),
      await mk("admin", "admin", "Admin1404@", "مدیر", "مدرسه", {
        grade: "—",
        className: "دفتر مدیریت",
        field: "—",
        studentNumber: "۱۰۰۱",
      }),
    ];
    writeUsers(users);
  })();
  return seeded;
}

/* ---------------- login lockout (per username, in-memory) ---------------- */

const attempts = new Map<string, { count: number; lockedUntil?: number }>();

function isLocked(username: string): number {
  const a = attempts.get(username.toLowerCase());
  if (a?.lockedUntil && a.lockedUntil > Date.now()) return a.lockedUntil - Date.now();
  return 0;
}

function registerFailure(username: string) {
  const key = username.toLowerCase();
  const a = attempts.get(key) ?? { count: 0 };
  a.count += 1;
  if (a.count >= LOCK_AFTER) {
    a.lockedUntil = Date.now() + LOCK_MS;
    a.count = 0;
  }
  attempts.set(key, a);
}

function clearFailures(username: string) {
  attempts.delete(username.toLowerCase());
}

/* ---------------- API implementation ---------------- */

export const mockBackend: AuthApi = {
  async register(input: RegisterInput): Promise<ApiResult<Session>> {
    await seed();
    await delay(500);
    const users = readUsers();
    const uname = input.username.toLowerCase();
    if (users.some((u) => u.username.toLowerCase() === uname)) {
      return { ok: false, error: "username_taken" };
    }
    if (users.some((u) => u.nationalId === input.nationalId)) {
      return { ok: false, error: "national_id_taken" };
    }
    if (passwordStrength(input.password).score < 3) {
      return { ok: false, error: "weak_password" };
    }
    const user: StoredUser = {
      id: crypto.randomUUID(),
      role: "student",
      username: input.username,
      firstName: input.firstName,
      lastName: input.lastName,
      fatherName: input.fatherName,
      birthDate: input.birthDate,
      nationalId: input.nationalId,
      phone: input.phone,
      email: input.email,
      avatar: input.avatar,
      grade: input.grade,
      className: input.className,
      field: input.field,
      academicYear: input.academicYear,
      studentNumber: input.studentNumber,
      createdAt: new Date().toISOString(),
      passwordHash: await hashPassword(input.password),
    };
    writeUsers([...users, user]);
    const session = createSession(user, true);
    return { ok: true, data: session };
  },

  async login(username, password, remember): Promise<ApiResult<Session>> {
    await seed();
    await delay(400);
    const remaining = isLocked(username);
    if (remaining > 0) return { ok: false, error: "account_locked" };

    const users = readUsers();
    const user = users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
    const valid = user ? await verifyPassword(password, user.passwordHash) : false;

    if (!user || !valid) {
      registerFailure(username);
      return { ok: false, error: "invalid_credentials" };
    }
    clearFailures(username);
    const session = createSession(user, remember);
    return { ok: true, data: session };
  },

  async logout(token) {
    await delay(150);
    const stored = readSession();
    if (stored?.token === token) localStorage.removeItem(SESSION_KEY);
  },

  async getSession(token) {
    await seed();
    await delay(100);
    const stored = readSession();
    if (!stored || stored.token !== token || stored.expiresAt <= Date.now()) {
      if (stored && stored.expiresAt <= Date.now()) localStorage.removeItem(SESSION_KEY);
      return null;
    }
    const user = readUsers().find((u) => u.id === stored.userId);
    return user ? { token, user: publicUser(user), expiresAt: stored.expiresAt, remember: stored.remember } : null;
  },

  async checkUsername(username) {
    await seed();
    await delay(350);
    const taken = readUsers().some((u) => u.username.toLowerCase() === username.toLowerCase());
    return { available: !taken };
  },

  async requestReset(identifier) {
    await seed();
    await delay(400);
    const key = identifier.trim().toLowerCase();
    const user = readUsers().find(
      (u) =>
        u.username.toLowerCase() === key ||
        u.nationalId === key ||
        u.phone === key
    );
    if (!user) return { ok: false, error: "not_found" };

    const resets = readResets();
    resets[user.id] = { code: generateResetCode(), expiresAt: Date.now() + RESET_TTL };
    localStorage.setItem(RESET_KEY, JSON.stringify(resets));
    // Demo-only: a real backend texts/emails this code instead of returning it.
    return { ok: true, data: { demoCode: resets[user.id].code } };
  },

  async completeReset(identifier, code, newPassword) {
    await delay(400);
    const key = identifier.trim().toLowerCase();
    const users = readUsers();
    const user = users.find(
      (u) => u.username.toLowerCase() === key || u.nationalId === key || u.phone === key
    );
    if (!user) return { ok: false, error: "not_found" };

    const resets = readResets();
    const entry = resets[user.id];
    if (!entry || entry.expiresAt < Date.now() || entry.code !== code.trim()) {
      return { ok: false, error: "invalid_code" };
    }
    if (passwordStrength(newPassword).score < 3) return { ok: false, error: "weak_password" };

    user.passwordHash = await hashPassword(newPassword);
    writeUsers(users);
    delete resets[user.id];
    localStorage.setItem(RESET_KEY, JSON.stringify(resets));
    localStorage.removeItem(SESSION_KEY);
    return { ok: true, data: null };
  },

  async changePassword(userId, current, next) {
    await delay(400);
    const users = readUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return { ok: false, error: "not_found" };
    if (!(await verifyPassword(current, user.passwordHash))) {
      return { ok: false, error: "wrong_password" };
    }
    if (passwordStrength(next).score < 3) return { ok: false, error: "weak_password" };
    user.passwordHash = await hashPassword(next);
    writeUsers(users);
    return { ok: true, data: null };
  },

  async updateProfile(userId, patch) {
    await delay(400);
    const users = readUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return { ok: false, error: "not_found" };
    if (patch.phone !== undefined) user.phone = patch.phone;
    if (patch.email !== undefined) user.email = patch.email;
    if (patch.avatar !== undefined) user.avatar = patch.avatar;
    writeUsers(users);
    return { ok: true, data: publicUser(user) };
  },
};

function createSession(user: StoredUser, remember: boolean): Session {
  const token = generateToken();
  const session = {
    token,
    userId: user.id,
    expiresAt: Date.now() + (remember ? REMEMBER_TTL : SESSION_TTL),
    remember,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return { token, user: publicUser(user), expiresAt: session.expiresAt, remember };
}

function readResets(): Record<string, StoredReset> {
  try {
    return JSON.parse(localStorage.getItem(RESET_KEY) ?? "{}") as Record<string, StoredReset>;
  } catch {
    return {};
  }
}
