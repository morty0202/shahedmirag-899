/**
 * Admin routes: user management (CRUD), password reset for any user.
 * All routes require admin role.
 */

import { Router } from "express";
import crypto from "node:crypto";
import { getDb, queryOne, queryAll, runSql } from "../db.mjs";
import { hashPassword, verifyTicket } from "../auth.mjs";

const router = Router();

/* ---- auth middleware ---- */

function requireAdmin(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "unauthorized" });
  const claims = verifyTicket(token);
  if (!claims || claims.role !== "admin") return res.status(403).json({ error: "forbidden" });
  req.admin = claims;
  next();
}

router.use(requireAdmin);

/* ---- helpers ---- */

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

/* ---- GET /api/admin/users ---- */

router.get("/users", async (req, res) => {
  try {
    const db = await getDb();
    const { role } = req.query;
    let rows;
    if (role) {
      rows = queryAll(db, "SELECT * FROM users WHERE role = ? ORDER BY created_at DESC", [role]);
    } else {
      rows = queryAll(db, "SELECT * FROM users ORDER BY created_at DESC");
    }
    res.json(rows.map(publicUser));
  } catch (err) {
    console.error("[admin:users]", err);
    res.status(500).json({ error: "server_error" });
  }
});

/* ---- GET /api/admin/users/:id ---- */

router.get("/users/:id", async (req, res) => {
  try {
    const db = await getDb();
    const row = queryOne(db, "SELECT * FROM users WHERE id = ?", [req.params.id]);
    if (!row) return res.status(404).json({ ok: false, error: "not_found" });
    res.json({ ok: true, data: publicUser(row) });
  } catch (err) {
    console.error("[admin:user]", err);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

/* ---- POST /api/admin/users ---- */

router.post("/users", async (req, res) => {
  try {
    const db = await getDb();
    const input = req.body;
    const uname = (input.username || "").trim().toLowerCase();

    if (!uname || uname.length < 4) return res.json({ ok: false, error: "username_taken" });
    if (queryOne(db, "SELECT 1 FROM users WHERE username = ?", [uname])) {
      return res.json({ ok: false, error: "username_taken" });
    }
    if (input.nationalId && queryOne(db, "SELECT 1 FROM users WHERE national_id = ?", [input.nationalId])) {
      return res.json({ ok: false, error: "national_id_taken" });
    }
    if (passwordStrength(input.password || "") < 3) return res.json({ ok: false, error: "weak_password" });

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(input.password);
    const now = new Date().toISOString();

    runSql(db,
      `INSERT INTO users (id, role, username, first_name, last_name, father_name, birth_date_jy, birth_date_jm, birth_date_jd, national_id, phone, email, grade, class_name, field, academic_year, student_number, password_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.role || "student", uname, input.firstName, input.lastName, input.fatherName || "—",
       input.birthDate?.jy || 1388, input.birthDate?.jm || 7, input.birthDate?.jd || 12,
       input.nationalId, input.phone || "", input.email || null,
       input.grade || "", input.className || "", input.field || "",
       input.academicYear || "", input.studentNumber || "", passwordHash, now]
    );

    const row = queryOne(db, "SELECT * FROM users WHERE id = ?", [id]);
    res.json({ ok: true, data: publicUser(row) });
  } catch (err) {
    console.error("[admin:create-user]", err);
    res.json({ ok: false, error: "server_error" });
  }
});

/* ---- PATCH /api/admin/users/:id ---- */

router.patch("/users/:id", async (req, res) => {
  try {
    const db = await getDb();
    const { id } = req.params;
    const patch = req.body;

    const existing = queryOne(db, "SELECT * FROM users WHERE id = ?", [id]);
    if (!existing) return res.json({ ok: false, error: "not_found" });

    if (patch.nationalId && patch.nationalId !== existing.national_id) {
      if (queryOne(db, "SELECT 1 FROM users WHERE id != ? AND national_id = ?", [id, patch.nationalId])) {
        return res.json({ ok: false, error: "national_id_taken" });
      }
    }

    const fieldMap = {
      firstName: "first_name",
      lastName: "last_name",
      fatherName: "father_name",
      nationalId: "national_id",
      phone: "phone",
      email: "email",
      role: "role",
      grade: "grade",
      className: "class_name",
      field: "field",
      academicYear: "academic_year",
      studentNumber: "student_number",
    };

    const updates = [];
    const values = [];

    for (const [key, col] of Object.entries(fieldMap)) {
      if (patch[key] !== undefined) {
        updates.push(`${col} = ?`);
        values.push(patch[key]);
      }
    }

    if (patch.birthDate) {
      updates.push("birth_date_jy = ?, birth_date_jm = ?, birth_date_jd = ?");
      values.push(patch.birthDate.jy, patch.birthDate.jm, patch.birthDate.jd);
    }

    if (updates.length > 0) {
      values.push(id);
      runSql(db, `UPDATE users SET ${updates.join(", ")} WHERE id = ?`, values);
    }

    const updated = queryOne(db, "SELECT * FROM users WHERE id = ?", [id]);
    res.json({ ok: true, data: publicUser(updated) });
  } catch (err) {
    console.error("[admin:update-user]", err);
    res.json({ ok: false, error: "server_error" });
  }
});

/* ---- DELETE /api/admin/users/:id ---- */

router.delete("/users/:id", async (req, res) => {
  try {
    const db = await getDb();
    const user = queryOne(db, "SELECT * FROM users WHERE id = ?", [req.params.id]);
    if (!user) return res.json({ ok: false, error: "not_found" });
    runSql(db, "DELETE FROM users WHERE id = ?", [req.params.id]);
    res.json({ ok: true, data: null });
  } catch (err) {
    console.error("[admin:delete-user]", err);
    res.json({ ok: false, error: "server_error" });
  }
});

/* ---- POST /api/admin/users/:id/reset-password ---- */

router.post("/users/:id/reset-password", async (req, res) => {
  try {
    const db = await getDb();
    const { newPassword } = req.body;
    const user = queryOne(db, "SELECT * FROM users WHERE id = ?", [req.params.id]);
    if (!user) return res.json({ ok: false, error: "not_found" });
    if (passwordStrength(newPassword || "") < 3) return res.json({ ok: false, error: "weak_password" });

    const hash = await hashPassword(newPassword);
    runSql(db, "UPDATE users SET password_hash = ? WHERE id = ?", [hash, req.params.id]);
    res.json({ ok: true, data: null });
  } catch (err) {
    console.error("[admin:reset-password]", err);
    res.json({ ok: false, error: "server_error" });
  }
});

/* ---- GET /api/admin/stats ---- */

router.get("/stats", async (req, res) => {
  try {
    const db = await getDb();
    const total = queryOne(db, "SELECT COUNT(*) as count FROM users").count;
    const students = queryOne(db, "SELECT COUNT(*) as count FROM users WHERE role = 'student'").count;
    const teachers = queryOne(db, "SELECT COUNT(*) as count FROM users WHERE role = 'teacher'").count;
    const admins = queryOne(db, "SELECT COUNT(*) as count FROM users WHERE role = 'admin'").count;
    const sessions = queryOne(db, "SELECT COUNT(*) as count FROM class_sessions").count;

    res.json({ total, students, teachers, admins, sessions });
  } catch (err) {
    console.error("[admin:stats]", err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
