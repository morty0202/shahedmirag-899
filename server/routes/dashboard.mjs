/**
 * Dashboard routes: today's schedule.
 */

import { Router } from "express";
import { getDb, queryAll } from "../db.mjs";
import { verifyTicket } from "../auth.mjs";

const router = Router();

router.use((req, res, next) => {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  const claims = token ? verifyTicket(token) : null;
  if (!claims) return res.status(401).json({ error: "unauthorized" });
  req.user = claims;
  next();
});

/* ---- GET /api/dashboard/schedule ---- */

router.get("/schedule", async (req, res) => {
  try {
    const db = await getDb();
    const rows = queryAll(db, "SELECT * FROM schedule_items ORDER BY id");
    res.json(rows.map((r) => ({
      id: r.id,
      time: r.time_text,
      lesson: r.lesson,
      room: r.room,
      teacher: r.teacher,
      status: r.status,
    })));
  } catch (err) {
    console.error("[dashboard:schedule]", err);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;