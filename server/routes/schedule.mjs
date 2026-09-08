/**
 * Schedule routes: manage school schedule / program items.
 *
 *   GET    /api/schedule              → list all schedule items
 *   POST   /api/schedule              → create (teacher/admin)
 *   PATCH  /api/schedule/:id          → update (teacher/admin)
 *   DELETE /api/schedule/:id          → delete (teacher/admin)
 */

import { Router } from "express";
import crypto from "node:crypto";
import { getDb, queryAll, queryOne, runSql } from "../db.mjs";
import { verifyTicket } from "../auth.mjs";

const router = Router();
const uuid = () => crypto.randomUUID();

function requireAuth(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  const claims = token ? verifyTicket(token) : null;
  if (!claims) return res.status(401).json({ error: "unauthorized" });
  req.user = claims;
  next();
}

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "unauthorized" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "forbidden" });
    next();
  };
}

router.use(requireAuth);

/* ---------- helpers ---------- */

function dbToApi(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    time: row.time_text,
    lesson: row.lesson,
    room: row.room,
    teacher: row.teacher,
    status: row.status,
  };
}

/* ---------- routes ---------- */

router.get("/schedule", async (req, res) => {
  try {
    const db = await getDb();
    const rows = queryAll(db, "SELECT * FROM schedule_items ORDER BY id");
    res.json(rows.map(dbToApi));
  } catch (err) {
    console.error("[schedule:list]", err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/schedule", requireRoles("teacher", "admin"), async (req, res) => {
  try {
    const db = await getDb();
    const { time, lesson, room, teacher, status } = req.body || {};
    if (!time || !lesson || !room || !teacher) {
      return res.status(400).json({ error: "missing_fields" });
    }
    const id = uuid();
    runSql(db,
      "INSERT INTO schedule_items (id, time_text, lesson, room, teacher, status) VALUES (?, ?, ?, ?, ?, ?)",
      [id, String(time).trim(), String(lesson).trim(), String(room).trim(), String(teacher).trim(), String(status || "upcoming")]
    );
    const row = queryOne(db, "SELECT * FROM schedule_items WHERE id = ?", [id]);
    res.json({ ok: true, data: dbToApi(row) });
  } catch (err) {
    console.error("[schedule:create]", err);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

router.patch("/schedule/:id", requireRoles("teacher", "admin"), async (req, res) => {
  try {
    const db = await getDb();
    const { time, lesson, room, teacher, status } = req.body || {};
    const updates = [];
    const params = [];
    if (time !== undefined) { updates.push("time_text = ?"); params.push(String(time).trim()); }
    if (lesson !== undefined) { updates.push("lesson = ?"); params.push(String(lesson).trim()); }
    if (room !== undefined) { updates.push("room = ?"); params.push(String(room).trim()); }
    if (teacher !== undefined) { updates.push("teacher = ?"); params.push(String(teacher).trim()); }
    if (status !== undefined) { updates.push("status = ?"); params.push(String(status)); }
    if (updates.length === 0) return res.status(400).json({ error: "no_changes" });
    params.push(req.params.id);
    runSql(db, `UPDATE schedule_items SET ${updates.join(", ")} WHERE id = ?`, params);
    const row = queryOne(db, "SELECT * FROM schedule_items WHERE id = ?", [req.params.id]);
    res.json({ ok: true, data: dbToApi(row) });
  } catch (err) {
    console.error("[schedule:update]", err);
    res.status(500).json({ error: "server_error" });
  }
});

router.delete("/schedule/:id", requireRoles("teacher", "admin"), async (req, res) => {
  try {
    const db = await getDb();
    runSql(db, "DELETE FROM schedule_items WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("[schedule:delete]", err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
