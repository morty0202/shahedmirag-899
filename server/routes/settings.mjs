/**
 * Settings routes: per-user preferences (theme + notifications).
 *
 *   GET  /api/settings        → current user settings (with defaults)
 *   PATCH /api/settings       → update (partial)
 */

import { Router } from "express";
import { getDb, queryOne, queryAll, runSql } from "../db.mjs";
import { verifyTicket } from "../auth.mjs";

const router = Router();

function requireAuth(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  const claims = token ? verifyTicket(token) : null;
  if (!claims) return res.status(401).json({ error: "unauthorized" });
  req.user = claims;
  next();
}

router.use(requireAuth);

const DEFAULTS = { theme: "dark", notifyBooklets: true, notifyTrips: false };

function rowToApi(row, userId) {
  return {
    userId,
    theme: row?.theme || DEFAULTS.theme,
    accent: row?.accent || "aurora",
    bgStyle: row?.bg_style || "none",
    notifyBooklets: row ? !!row.notify_booklets : DEFAULTS.notifyBooklets,
    notifyTrips: row ? !!row.notify_trips : DEFAULTS.notifyTrips,
  };
}

router.get("/", async (req, res) => {
  try {
    const db = await getDb();
    const row = queryOne(db, "SELECT * FROM user_settings WHERE user_id = ?", [req.user.sub]);
    res.json({ ok: true, data: rowToApi(row, req.user.sub) });
  } catch (err) {
    console.error("[settings:get]", err);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

const ACCENT_IDS = ["aurora", "wine", "forest", "sunset", "ocean", "rose"];
const BG_IDS = ["none", "aurora", "stars", "bubbles", "snow", "mesh"];

router.patch("/", async (req, res) => {
  try {
    const db = await getDb();
    const patch = req.body || {};
    const existing = queryOne(db, "SELECT * FROM user_settings WHERE user_id = ?", [req.user.sub]);

    const theme = patch.theme === "light" ? "light" : "dark";
    const accent = ACCENT_IDS.includes(patch.accent) ? patch.accent : existing?.accent || "aurora";
    const bgStyle = BG_IDS.includes(patch.bgStyle) ? patch.bgStyle : existing?.bg_style || "none";
    const notifyBooklets = patch.notifyBooklets === undefined ? (existing ? !!existing.notify_booklets : true) : !!patch.notifyBooklets;
    const notifyTrips = patch.notifyTrips === undefined ? (existing ? !!existing.notify_trips : false) : !!patch.notifyTrips;

    runSql(db,
      `INSERT INTO user_settings (user_id, theme, accent, bg_style, notify_booklets, notify_trips, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET
         theme = excluded.theme,
         accent = excluded.accent,
         bg_style = excluded.bg_style,
         notify_booklets = excluded.notify_booklets,
         notify_trips = excluded.notify_trips,
         updated_at = datetime('now')`,
      [req.user.sub, theme, accent, bgStyle, notifyBooklets ? 1 : 0, notifyTrips ? 1 : 0]
    );

    res.json({ ok: true, data: { userId: req.user.sub, theme, accent, bgStyle, notifyBooklets, notifyTrips } });
  } catch (err) {
    console.error("[settings:patch]", err);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

export default router;