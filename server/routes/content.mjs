/**
 * Content routes: announcements, honors, field trips, gallery.
 *
 *   GET  → any authenticated user
 *   POST → teacher/admin (announcements & field trips), admin-only (honors & gallery)
 */

import { Router } from "express";
import crypto from "node:crypto";
import { getDb, queryOne, queryAll, runSql } from "../db.mjs";
import { verifyTicket } from "../auth.mjs";
import { createNotification } from "./notifications.mjs";

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

/* ================= Announcements ================= */

router.get("/announcements", async (req, res) => {
  try {
    const db = await getDb();
    const rows = queryAll(db, "SELECT * FROM announcements ORDER BY created_at DESC");
    res.json(rows.map((r) => ({
      id: r.id, title: r.title, body: r.body,
      authorName: r.author_name, createdAt: r.created_at,
    })));
  } catch (err) {
    console.error("[content:announcements:list]", err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/announcements", requireRoles("teacher", "admin"), async (req, res) => {
  try {
    const db = await getDb();
    const { title, body } = req.body || {};
    if (!title || !String(title).trim()) return res.status(400).json({ error: "missing_fields" });

    const id = uuid();
    runSql(db,
      "INSERT INTO announcements (id, title, body, author_name, created_at) VALUES (?, ?, ?, ?, datetime('now'))",
      [id, String(title).trim(), String(body || "").trim(), req.user.name || ""]
    );
    const row = queryOne(db, "SELECT * FROM announcements WHERE id = ?", [id]);
    createNotification(db, {
      type: "announcement",
      title: "اطلاعیه جدید",
      message: String(title).trim(),
      link: "/announcements",
    });
    res.json({ ok: true, data: { id: row.id, title: row.title, body: row.body, authorName: row.author_name, createdAt: row.created_at } });
  } catch (err) {
    console.error("[content:announcements:create]", err);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

router.delete("/announcements/:id", requireRoles("teacher", "admin"), async (req, res) => {
  try {
    const db = await getDb();
    const changes = runSql(db, "DELETE FROM announcements WHERE id = ?", [req.params.id]);
    if (changes === 0) return res.status(404).json({ error: "not_found" });
    res.json({ ok: true });
  } catch (err) {
    console.error("[content:announcements:delete]", err);
    res.status(500).json({ error: "server_error" });
  }
});

/* ================= Honors ================= */

router.get("/honors", async (req, res) => {
  try {
    const db = await getDb();
    const rows = queryAll(db, "SELECT * FROM honors ORDER BY created_at DESC");
    res.json(rows.map((r) => ({ id: r.id, title: r.title, description: r.description, badge: r.badge, badgeColor: r.badge_color, createdAt: r.created_at })));
  } catch (err) {
    console.error("[content:honors:list]", err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/honors", requireRoles("admin"), async (req, res) => {
  try {
    const db = await getDb();
    const { title, description, badge, badgeColor } = req.body || {};
    if (!title || !String(title).trim()) return res.status(400).json({ error: "missing_fields" });

    const id = uuid();
    runSql(db,
      "INSERT INTO honors (id, title, description, badge, badge_color, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))",
      [id, String(title).trim(), String(description || "").trim(), String(badge || ""), String(badgeColor || "")]
    );
    createNotification(db, {
      type: "honor",
      title: "شکست جدید",
      message: String(title).trim(),
      link: "/honors",
    });
    const row = queryOne(db, "SELECT * FROM honors WHERE id = ?", [id]);
    res.json({ ok: true, data: { id, title: String(title).trim(), description: String(description || "").trim(), badge: String(badge || ""), badgeColor: String(badgeColor || "") } });
  } catch (err) {
    console.error("[content:honors:create]", err);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

router.delete("/honors/:id", requireRoles("admin"), async (req, res) => {
  try {
    const db = await getDb();
    const changes = runSql(db, "DELETE FROM honors WHERE id = ?", [req.params.id]);
    if (changes === 0) return res.status(404).json({ error: "not_found" });
    res.json({ ok: true });
  } catch (err) {
    console.error("[content:honors:delete]", err);
    res.status(500).json({ error: "server_error" });
  }
});

/* ================= Field trips ================= */

router.get("/field-trips", async (req, res) => {
  try {
    const db = await getDb();
    const rows = queryAll(db, "SELECT * FROM field_trips ORDER BY created_at DESC");
    res.json(rows.map((r) => ({ id: r.id, title: r.title, dateText: r.date_text, description: r.description, type: r.type, typeColor: r.type_color, createdAt: r.created_at })));
  } catch (err) {
    console.error("[content:trips:list]", err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/field-trips", requireRoles("teacher", "admin"), async (req, res) => {
  try {
    const db = await getDb();
    const { title, dateText, description, type, typeColor } = req.body || {};
    if (!title || !String(title).trim()) return res.status(400).json({ error: "missing_fields" });

    const id = uuid();
    runSql(db,
      "INSERT INTO field_trips (id, title, date_text, description, type, type_color, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))",
      [id, String(title).trim(), String(dateText || ""), String(description || "").trim(), String(type || ""), String(typeColor || "")]
    );
    createNotification(db, {
      type: "field_trip",
      title: "اردوی جدید",
      message: String(title).trim(),
      link: "/field-trips",
    });
    const row = queryOne(db, "SELECT * FROM field_trips WHERE id = ?", [id]);
    res.json({ ok: true, data: { id: row.id, title: row.title, dateText: row.date_text, description: row.description, type: row.type, typeColor: row.type_color, createdAt: row.created_at } });
  } catch (err) {
    console.error("[content:trips:create]", err);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

router.delete("/field-trips/:id", requireRoles("teacher", "admin"), async (req, res) => {
  try {
    const db = await getDb();
    const changes = runSql(db, "DELETE FROM field_trips WHERE id = ?", [req.params.id]);
    if (changes === 0) return res.status(404).json({ error: "not_found" });
    res.json({ ok: true });
  } catch (err) {
    console.error("[content:trips:delete]", err);
    res.status(500).json({ error: "server_error" });
  }
});

/* ================= Gallery ================= */

router.get("/gallery", async (req, res) => {
  try {
    const db = await getDb();
    const rows = queryAll(db, "SELECT * FROM gallery_items ORDER BY created_at DESC");
    res.json(rows.map((r) => ({ id: r.id, title: r.title, imgUrl: r.img_url || undefined, createdAt: r.created_at })));
  } catch (err) {
    console.error("[content:gallery:list]", err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/gallery", requireRoles("admin"), async (req, res) => {
  try {
    const db = await getDb();
    const { title, imgUrl } = req.body || {};
    if (!title && !imgUrl) return res.status(400).json({ error: "missing_fields" });

    const id = uuid();
    runSql(db,
      "INSERT INTO gallery_items (id, title, img_url, created_at) VALUES (?, ?, ?, datetime('now'))",
      [id, String(title || "تصویر"), imgUrl || null]
    );
    createNotification(db, {
      type: "gallery",
      title: "تصویر جدید",
      message: String(title || "تصویر"),
      link: "/gallery",
    });
    const row = queryOne(db, "SELECT * FROM gallery_items WHERE id = ?", [id]);
    res.json({ ok: true, data: { id: row.id, title: row.title, imgUrl: row.img_url || undefined } });
  } catch (err) {
    console.error("[content:gallery:create]", err);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

router.delete("/gallery/:id", requireRoles("admin"), async (req, res) => {
  try {
    const db = await getDb();
    const changes = runSql(db, "DELETE FROM gallery_items WHERE id = ?", [req.params.id]);
    if (changes === 0) return res.status(404).json({ error: "not_found" });
    res.json({ ok: true });
  } catch (err) {
    console.error("[content:gallery:delete]", err);
    res.status(500).json({ error: "server_error" });
  }
});

/* ================= Search ================= */

router.get("/search", async (req, res) => {
  try {
    const db = await getDb();
    const q = String((req.query.q || "").trim()).toLowerCase();
    if (!q) return res.json({ results: [] });

    const results = [];

    const annRows = queryAll(db, "SELECT id, title, body, created_at FROM announcements WHERE lower(title) LIKE ? OR lower(body) LIKE ? ORDER BY created_at DESC LIMIT 10", [`%${q}%`, `%${q}%`]);
    annRows.forEach(r => results.push({ type: "announcement", id: r.id, title: r.title, desc: r.body, link: "/announcements", createdAt: r.created_at }));

    const tripRows = queryAll(db, "SELECT id, title, description, created_at FROM field_trips WHERE lower(title) LIKE ? OR lower(description) LIKE ? ORDER BY created_at DESC LIMIT 10", [`%${q}%`, `%${q}%`]);
    tripRows.forEach(r => results.push({ type: "field_trip", id: r.id, title: r.title, desc: r.description, link: "/field-trips", createdAt: r.created_at }));

    const honorRows = queryAll(db, "SELECT id, title, description, created_at FROM honors WHERE lower(title) LIKE ? OR lower(description) LIKE ? ORDER BY created_at DESC LIMIT 10", [`%${q}%`, `%${q}%`]);
    honorRows.forEach(r => results.push({ type: "honor", id: r.id, title: r.title, desc: r.description, link: "/honors", createdAt: r.created_at }));

    const galRows = queryAll(db, "SELECT id, title, created_at FROM gallery_items WHERE lower(title) LIKE ? ORDER BY created_at DESC LIMIT 10", [`%${q}%`]);
    galRows.forEach(r => results.push({ type: "gallery", id: r.id, title: r.title, desc: "", link: "/gallery", createdAt: r.created_at }));

    res.json({ results });
  } catch (err) {
    console.error("[content:search]", err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;