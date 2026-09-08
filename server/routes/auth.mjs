/**
 * Authentication routes: register, login, logout, session, username check,
 * password reset, change password, update profile.
 */

import { Router } from "express";
import crypto from "node:crypto";
import { getDb, queryOne, queryAll, runSql } from "../db.mjs";
import { hashPassword, verifyPassword, issueTicket, verifyTicket } from "../auth.mjs";

const router = Router();

const REMEMBER_TTL = 30 * 24 * 60 * 60; // 30 days in seconds
const SESSION_TTL = 12 * 60 * 60; // 12 hours in seconds
const RESET_TTL = 10 * 60 * 1000; // 10 minutes in ms
const LOCK_AFTER = 5;
const LOCK_MS = 2 * 60 * 1000; // 2 minutes

/* ---- helpers ---- */

function uuid() {
  return crypto.randomUUID();
}

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    role: row.role,
    username: row.username,
    firstName: row.first_name,
    lastName: row.last_name,
    fatherName: row.father_name,
    birthDate: { jy: row.birth_date_jy, jm: row.birth_date_jm, jd: row.birth_date_jd },
    nationalId: row.national_id,
    phone: row.phone,
    email: row.email || undefined,
    avatar: row.avatar || undefined,
    grade: row.grade,
    className: row.class_name,
    field: row.field,
    academicYear: row.academic_year,
    studentNumber: row.student_number,
    createdAt: row.created_at,
  };
}

function passwordStrength(pw) {
  const hasLength = pw.length >= 8;
  const hasLong = pw.length >= 12;
  const hasLetter = /[A-Za-z]/.test(pw) || /[\u0600-\u06FF]/.test(pw);
  const hasDigit = /\d/.test(pw);
  const hasCase = /[a-z]/.test(pw) && /[A-Z]/.test(pw);
  const hasSpecial = /[^A-Za-z0-9\u0600-\u06FF]/.test(pw);
  const parts = [hasLength, hasLetter && hasDigit, hasCase || hasSpecial, hasLong];
  return parts.filter(Boolean).length;
}

function checkLock(db, username) {
  const row = queryOne(db, "SELECT count, locked_until FROM login_attempts WHERE username = ?", [username]);
  if (!row) return 0;
  if (row.locked_until && row.locked_until > Date.now()) return row.locked_until - Date.now();
  return 0;
}

function registerFailure(db, username) {
  const row = queryOne(db, "SELECT count FROM login_attempts WHERE username = ?", [username]);
  if (!row) {
    runSql(db, "INSERT INTO login_attempts (username, count, locked_until) VALUES (?, 1, NULL)", [username]);
  } else {
    const newCount = row.count + 1;
    if (newCount >= LOCK_AFTER) {
      runSql(db, "UPDATE login_attempts SET count = 0, locked_until = ? WHERE username = ?", [Date.now() + LOCK_MS, username]);
    } else {
      runSql(db, "UPDATE login_attempts SET count = ? WHERE username = ?", [newCount, username]);
    }
  }
}

function clearFailures(db, username) {
  runSql(db, "DELETE FROM login_attempts WHERE username = ?", [username]);
}

/* ---- routes ---- */

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const db = await getDb();
    const input = req.body;
    const uname = (input.username || "").trim().toLowerCase();

    if (!uname || uname.length < 4) return res.json({ ok: false, error: "username_taken" });
    if (passwordStrength(input.password || "") < 3) return res.json({ ok: false, error: "weak_password" });
    if (queryOne(db, "SELECT 1 FROM users WHERE username = ?", [uname])) {
      return res.json({ ok: false, error: "username_taken" });
    }
    if (input.nationalId && queryOne(db, "SELECT 1 FROM users WHERE national_id = ?", [input.nationalId])) {
      return res.json({ ok: false, error: "national_id_taken" });
    }

    const id = uuid();
    const passwordHash = await hashPassword(input.password);
    const now = new Date().toISOString();

    runSql(db,
      `INSERT INTO users (id, role, username, first_name, last_name, father_name, birth_date_jy, birth_date_jm, birth_date_jd, national_id, phone, email, grade, class_name, field, academic_year, student_number, password_hash, created_at)
       VALUES (?, 'student', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, uname, input.firstName, input.lastName, input.fatherName || "—",
       input.birthDate?.jy || 1388, input.birthDate?.jm || 7, input.birthDate?.jd || 12,
       input.nationalId, input.phone || "", input.email || null,
       input.grade || "", input.className || "", input.field || "",
       input.academicYear || "", input.studentNumber || "", passwordHash, now]
    );

    const user = publicUser({ id, role: "student", username: uname, first_name: input.firstName, last_name: input.lastName, father_name: input.fatherName || "—", birth_date_jy: input.birthDate?.jy || 1388, birth_date_jm: input.birthDate?.jm || 7, birth_date_jd: input.birthDate?.jd || 12, national_id: input.nationalId, phone: input.phone || "", email: input.email || null, grade: input.grade || "", class_name: input.className || "", field: input.field || "", academic_year: input.academicYear || "", student_number: input.studentNumber || "", created_at: now });
    const token = issueTicket({ userId: id, name: `${input.firstName} ${input.lastName}`, role: "student" });
    const expiresAt = Date.now() + REMEMBER_TTL * 1000;

    res.json({ ok: true, data: { token, user, expiresAt, remember: true } });
  } catch (err) {
    console.error("[auth:register]", err);
    res.json({ ok: false, error: "server_error" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const db = await getDb();
    const { username, password, remember } = req.body;
    const uname = (username || "").trim().toLowerCase();

    const remaining = checkLock(db, uname);
    if (remaining > 0) return res.json({ ok: false, error: "account_locked" });

    const row = queryOne(db, "SELECT * FROM users WHERE username = ?", [uname]);
    if (!row || !(await verifyPassword(password || "", row.password_hash))) {
      registerFailure(db, uname);
      return res.json({ ok: false, error: "invalid_credentials" });
    }

    clearFailures(db, uname);

    const user = publicUser(row);
    const token = issueTicket({ userId: row.id, name: `${row.first_name} ${row.last_name}`, role: row.role });
    const ttl = remember ? REMEMBER_TTL : SESSION_TTL;
    const expiresAt = Date.now() + ttl * 1000;

    res.json({ ok: true, data: { token, user, expiresAt, remember: !!remember } });
  } catch (err) {
    console.error("[auth:login]", err);
    res.json({ ok: false, error: "server_error" });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  res.json({ ok: true });
});

// GET /api/auth/session
router.get("/session", async (req, res) => {
  try {
    const db = await getDb();
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    if (!token) return res.json({ session: null });

    const claims = verifyTicket(token);
    if (!claims) return res.json({ session: null });

    const row = queryOne(db, "SELECT * FROM users WHERE id = ?", [claims.sub]);
    if (!row) return res.json({ session: null });

    res.json({
      session: {
        token,
        user: publicUser(row),
        expiresAt: claims.exp * 1000,
        remember: claims.exp * 1000 - Date.now() > SESSION_TTL * 1000,
      },
    });
  } catch (err) {
    console.error("[auth:session]", err);
    res.json({ session: null });
  }
});

// GET /api/auth/check-username/:username
router.get("/check-username/:username", async (req, res) => {
  const db = await getDb();
  const uname = req.params.username.trim().toLowerCase();
  const taken = !!queryOne(db, "SELECT 1 FROM users WHERE username = ?", [uname]);
  res.json({ available: !taken });
});

// POST /api/auth/request-reset
router.post("/request-reset", async (req, res) => {
  try {
    const db = await getDb();
    const identifier = (req.body.identifier || "").trim().toLowerCase();
    const row = queryOne(db, "SELECT * FROM users WHERE username = ? OR national_id = ? OR phone = ?", [identifier, identifier, identifier]);
    if (!row) return res.json({ ok: false, error: "not_found" });

    const code = String(100000 + Math.floor(Math.random() * 900000));
    const expiresAt = Date.now() + RESET_TTL;
    runSql(db, "INSERT OR REPLACE INTO reset_codes (user_id, code, expires_at) VALUES (?, ?, ?)", [row.id, code, expiresAt]);

    res.json({ ok: true, data: { demoCode: code } });
  } catch (err) {
    console.error("[auth:request-reset]", err);
    res.json({ ok: false, error: "server_error" });
  }
});

// POST /api/auth/complete-reset
router.post("/complete-reset", async (req, res) => {
  try {
    const db = await getDb();
    const { identifier, code, newPassword } = req.body;
    const key = (identifier || "").trim().toLowerCase();

    const user = queryOne(db, "SELECT * FROM users WHERE username = ? OR national_id = ? OR phone = ?", [key, key, key]);
    if (!user) return res.json({ ok: false, error: "not_found" });

    const entry = queryOne(db, "SELECT * FROM reset_codes WHERE user_id = ?", [user.id]);
    if (!entry || entry.expires_at < Date.now() || entry.code !== (code || "").trim()) {
      return res.json({ ok: false, error: "invalid_code" });
    }
    if (passwordStrength(newPassword || "") < 3) return res.json({ ok: false, error: "weak_password" });

    const hash = await hashPassword(newPassword);
    runSql(db, "UPDATE users SET password_hash = ? WHERE id = ?", [hash, user.id]);
    runSql(db, "DELETE FROM reset_codes WHERE user_id = ?", [user.id]);

    res.json({ ok: true, data: null });
  } catch (err) {
    console.error("[auth:complete-reset]", err);
    res.json({ ok: false, error: "server_error" });
  }
});

// POST /api/auth/change-password
router.post("/change-password", async (req, res) => {
  try {
    const db = await getDb();
    const { userId, current, next: newPassword } = req.body;

    const user = queryOne(db, "SELECT * FROM users WHERE id = ?", [userId]);
    if (!user) return res.json({ ok: false, error: "not_found" });
    if (!(await verifyPassword(current || "", user.password_hash))) {
      return res.json({ ok: false, error: "wrong_password" });
    }
    if (passwordStrength(newPassword || "") < 3) return res.json({ ok: false, error: "weak_password" });

    const hash = await hashPassword(newPassword);
    runSql(db, "UPDATE users SET password_hash = ? WHERE id = ?", [hash, user.id]);

    res.json({ ok: true, data: null });
  } catch (err) {
    console.error("[auth:change-password]", err);
    res.json({ ok: false, error: "server_error" });
  }
});

// POST /api/auth/update-profile
router.post("/update-profile", async (req, res) => {
  try {
    const db = await getDb();
    const { userId, patch } = req.body;

    const user = queryOne(db, "SELECT * FROM users WHERE id = ?", [userId]);
    if (!user) return res.json({ ok: false, error: "not_found" });

    const updates = [];
    const values = [];
    if (patch.phone !== undefined) { updates.push("phone = ?"); values.push(patch.phone); }
    if (patch.email !== undefined) { updates.push("email = ?"); values.push(patch.email); }
    if (patch.avatar !== undefined) { updates.push("avatar = ?"); values.push(patch.avatar); }

    if (updates.length > 0) {
      values.push(userId);
      runSql(db, `UPDATE users SET ${updates.join(", ")} WHERE id = ?`, values);
    }

    const updated = queryOne(db, "SELECT * FROM users WHERE id = ?", [userId]);
    res.json({ ok: true, data: publicUser(updated) });
  } catch (err) {
    console.error("[auth:update-profile]", err);
    res.json({ ok: false, error: "server_error" });
  }
});

export default router;
