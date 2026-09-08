/**
 * Education routes: booklets & videos per grade/classroom.
 *
 *   GET    /api/education/items?grade=&classroom=   → list content
 *   GET    /api/education/mine                      → uploads by the current user
 *   POST   /api/education/items                     → upload (teacher/admin)
 *   DELETE /api/education/items/:id                 → remove (teacher/admin or uploader)
 */

import { Router } from "express";
import crypto from "node:crypto";
import { getDb, queryOne, queryAll, runSql } from "../db.mjs";
import { verifyTicket } from "../auth.mjs";
import { createNotification } from "./notifications.mjs";

const router = Router();

/* ---- auth middlewares ---- */

function requireAuth(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  const claims = token ? verifyTicket(token) : null;
  if (!claims) return res.status(401).json({ error: "unauthorized" });
  req.user = claims;
  next();
}

function requireWrite(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "unauthorized" });
  if (req.user.role !== "teacher" && req.user.role !== "admin") {
    return res.status(403).json({ error: "forbidden" });
  }
  next();
}

router.use(requireAuth);

/* ---- helpers ---- */

function uuid() {
  return crypto.randomUUID();
}

function dbItemToApi(row) {
  if (!row) return null;
  return {
    id: row.id,
    gradeId: row.grade_id,
    classroomId: row.classroom_id,
    title: row.title,
    kind: row.kind,
    name: row.name,
    sizeLabel: row.size_label,
    sizeBytes: row.size_bytes,
    mime: row.mime,
    dataUrl: row.data_url || undefined,
    uploaderId: row.uploader_id || undefined,
    uploaderName: row.uploader_name,
    createdAt: row.created_at,
  };
}

/* ---- GET /api/education/items ---- */

router.get("/items", async (req, res) => {
  try {
    const db = await getDb();
    const { grade, classroom } = req.query;
    const where = [];
    const params = [];
    if (grade) { where.push("grade_id = ?"); params.push(String(grade)); }
    if (classroom) { where.push("classroom_id = ?"); params.push(String(classroom)); }
    const sql = `SELECT * FROM education_items${where.length ? " WHERE " + where.join(" AND ") : ""} ORDER BY created_at DESC`;
    res.json(queryAll(db, sql, params).map(dbItemToApi));
  } catch (err) {
    console.error("[education:list]", err);
    res.status(500).json({ error: "server_error" });
  }
});

/* ---- GET /api/education/mine ---- */

router.get("/mine", async (req, res) => {
  try {
    const db = await getDb();
    const rows = queryAll(db, "SELECT * FROM education_items WHERE uploader_id = ? ORDER BY created_at DESC", [req.user.sub]);
    res.json(rows.map(dbItemToApi));
  } catch (err) {
    console.error("[education:mine]", err);
    res.status(500).json({ error: "server_error" });
  }
});

/* ---- POST /api/education/items (teacher/admin) ---- */

router.post("/items", requireWrite, async (req, res) => {
  try {
    const db = await getDb();
    const input = req.body || {};

    if (!input.gradeId || !input.classroomId || !input.name) {
      return res.status(400).json({ error: "missing_fields" });
    }
    if (typeof input.dataUrl === "string" && input.dataUrl.length > 25 * 1024 * 1024) {
      return res.status(413).json({ error: "file_too_large" });
    }

    const id = uuid();
    runSql(db,
      `INSERT INTO education_items
       (id, grade_id, classroom_id, title, kind, name, size_label, size_bytes, mime, data_url, uploader_id, uploader_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [id, input.gradeId, input.classroomId,
       input.title || input.name,
       input.kind === "video" ? "video" : "file",
       input.name,
       input.sizeLabel || "",
       Number(input.sizeBytes) || 0,
       input.mime || "",
       input.dataUrl || null,
       req.user.sub,
       req.user.name || ""]
    );

    const row = queryOne(db, "SELECT * FROM education_items WHERE id = ?", [id]);
    createNotification(db, {
      type: "education",
      title: "جزوه جدید",
      message: input.name,
      link: "/education",
    });
    res.json({ ok: true, data: dbItemToApi(row) });
  } catch (err) {
    console.error("[education:create]", err);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

/* ---- DELETE /api/education/items/:id ---- */

router.delete("/items/:id", async (req, res) => {
  try {
    const db = await getDb();
    const row = queryOne(db, "SELECT * FROM education_items WHERE id = ?", [req.params.id]);
    if (!row) return res.status(404).json({ error: "not_found" });

    const canDelete =
      req.user.role === "admin" || req.user.role === "teacher" || row.uploader_id === req.user.sub;
    if (!canDelete) return res.status(403).json({ error: "forbidden" });

    runSql(db, "DELETE FROM education_items WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("[education:delete]", err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;