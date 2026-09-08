/**
 * Notifications routes.
 *
 *   GET    /api/notifications                    → list current user's notifications
 *   PATCH  /api/notifications/:id/read           → mark as read
 *   PATCH  /api/notifications/read-all           → mark all as read
 *   POST   /api/notifications                    → create (admin/teacher)
 *   DELETE /api/notifications/:id                → delete (admin/teacher)
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
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    link: row.link || undefined,
    read: !!row.read,
    createdAt: row.created_at,
  };
}

export function createNotification(db, input) {
  const id = uuid();
  runSql(db,
    "INSERT INTO notifications (id, user_id, type, title, message, link, read, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'))",
    [id, input.userId || null, input.type || "announcement", input.title || "", input.message || "", input.link || null]
  );
  return id;
}

/* ---------- routes ---------- */

router.get("/notifications", async (req, res) => {
  try {
    const db = await getDb();
    const rows = queryAll(db,
      "SELECT * FROM notifications WHERE user_id IS NULL OR user_id = ? ORDER BY created_at DESC LIMIT 50",
      [req.user.sub]
    );
    res.json(rows.map(dbToApi));
  } catch (err) {
    console.error("[notifications:list]", err);
    res.status(500).json({ error: "server_error" });
  }
});

router.patch("/notifications/:id/read", async (req, res) => {
  try {
    const db = await getDb();
    runSql(db, "UPDATE notifications SET read = 1 WHERE id = ? AND (user_id IS NULL OR user_id = ?)", [req.params.id, req.user.sub]);
    res.json({ ok: true });
  } catch (err) {
    console.error("[notifications:read]", err);
    res.status(500).json({ error: "server_error" });
  }
});

router.patch("/notifications/read-all", async (req, res) => {
  try {
    const db = await getDb();
    runSql(db, "UPDATE notifications SET read = 1 WHERE (user_id IS NULL OR user_id = ?) AND read = 0", [req.user.sub]);
    res.json({ ok: true });
  } catch (err) {
    console.error("[notifications:read-all]", err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/notifications", requireRoles("teacher", "admin"), async (req, res) => {
  try {
    const db = await getDb();
    const { type, title, message, link, userId } = req.body || {};
    if (!title || !String(title).trim()) return res.status(400).json({ error: "missing_fields" });
    const id = createNotification(db, {
      type: type || "announcement",
      title: String(title).trim(),
      message: String(message || "").trim(),
      link: link || null,
      userId: userId || null,
    });
    const row = queryOne(db, "SELECT * FROM notifications WHERE id = ?", [id]);
    res.json({ ok: true, data: dbToApi(row) });
  } catch (err) {
    console.error("[notifications:create]", err);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

router.delete("/notifications/:id", requireRoles("teacher", "admin"), async (req, res) => {
  try {
    const db = await getDb();
    runSql(db, "DELETE FROM notifications WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("[notifications:delete]", err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
