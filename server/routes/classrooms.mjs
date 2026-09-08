/**
 * Classroom routes: class session CRUD, attendance recording & querying.
 */

import { Router } from "express";
import crypto from "node:crypto";
import { getDb, queryOne, queryAll, runSql } from "../db.mjs";

const router = Router();

/* ---- helpers ---- */

function uuid() {
  return crypto.randomUUID();
}

function roomCodeOf(id) {
  return id.slice(0, 8).toUpperCase();
}

function dbSessionToApi(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    grade: row.grade,
    date: { jy: row.date_jy, jm: row.date_jm, jd: row.date_jd },
    time: row.time,
    durationMin: row.duration_min,
    roomCode: row.room_code,
    teacherName: row.teacher_name,
    status: row.status,
  };
}

/* ---- GET /api/classrooms/sessions ---- */

router.get("/sessions", async (req, res) => {
  try {
    const db = await getDb();
    const rows = queryAll(db, "SELECT * FROM class_sessions ORDER BY date_jy, date_jm, date_jd, time");
    res.json(rows.map(dbSessionToApi));
  } catch (err) {
    console.error("[classrooms:list]", err);
    res.status(500).json({ error: "server_error" });
  }
});

/* ---- GET /api/classrooms/sessions/:id ---- */

router.get("/sessions/:id", async (req, res) => {
  try {
    const db = await getDb();
    const row = queryOne(db, "SELECT * FROM class_sessions WHERE id = ?", [req.params.id]);
    if (!row) return res.status(404).json({ error: "not_found" });
    res.json(dbSessionToApi(row));
  } catch (err) {
    console.error("[classrooms:get]", err);
    res.status(500).json({ error: "server_error" });
  }
});

/* ---- POST /api/classrooms/sessions ---- */

router.post("/sessions", async (req, res) => {
  try {
    const db = await getDb();
    const input = req.body;
    const id = uuid();
    const roomCode = roomCodeOf(id);

    runSql(db,
      `INSERT INTO class_sessions (id, title, subject, grade, date_jy, date_jm, date_jd, time, duration_min, room_code, teacher_name, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')`,
      [id, input.title, input.subject, input.grade,
       input.date?.jy || 1404, input.date?.jm || 6, input.date?.jd || 20,
       input.time || "10:00", input.durationMin || 60, roomCode, input.teacherName || "معلم"]
    );

    const row = queryOne(db, "SELECT * FROM class_sessions WHERE id = ?", [id]);
    res.json(dbSessionToApi(row));
  } catch (err) {
    console.error("[classrooms:create]", err);
    res.status(500).json({ error: "server_error" });
  }
});

/* ---- DELETE /api/classrooms/sessions/:id ---- */

router.delete("/sessions/:id", async (req, res) => {
  try {
    const db = await getDb();
    const changes = runSql(db, "DELETE FROM class_sessions WHERE id = ?", [req.params.id]);
    if (changes === 0) return res.status(404).json({ error: "not_found" });
    res.json({ ok: true });
  } catch (err) {
    console.error("[classrooms:delete]", err);
    res.status(500).json({ error: "server_error" });
  }
});

/* ---- GET /api/classrooms/attendance/:roomCode ---- */

router.get("/attendance/:roomCode", async (req, res) => {
  try {
    const db = await getDb();
    const entries = queryAll(db, "SELECT * FROM attendance WHERE room_code = ? ORDER BY at", [req.params.roomCode]);

    const map = new Map();
    for (const e of entries) {
      const cur = map.get(e.name) || { name: e.name, role: e.role, joins: 0, lastJoin: 0 };
      if (e.type === "join") {
        cur.joins += 1;
        cur.lastJoin = e.at;
      }
      map.set(e.name, cur);
    }

    res.json(Array.from(map.values()).sort((a, b) => b.lastJoin - a.lastJoin));
  } catch (err) {
    console.error("[classrooms:attendance]", err);
    res.status(500).json({ error: "server_error" });
  }
});

/* ---- POST /api/classrooms/attendance ---- */

router.post("/attendance", async (req, res) => {
  try {
    const db = await getDb();
    const { roomCode, name, role, type, at } = req.body;

    runSql(db,
      "INSERT INTO attendance (room_code, name, role, type, at) VALUES (?, ?, ?, ?, ?)",
      [roomCode, name, role, type, at || Date.now()]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("[classrooms:record]", err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
