/**
 * Chat history routes for the AI assistant.
 *
 *   GET    /api/chat/conversations                → list user's conversations
 *   POST   /api/chat/conversations                → create conversation
 *   GET    /api/chat/conversations/:id            → get conversation with messages
 *   PATCH  /api/chat/conversations/:id            → update title
 *   DELETE /api/chat/conversations/:id            → delete conversation
 *   POST   /api/chat/conversations/:id/messages   → append message
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

router.use(requireAuth);

/* ---------- helpers ---------- */

function dbConversationToApi(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title || "گفتگوی جدید",
    model: row.model || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function dbMessageToApi(row) {
  if (!row) return null;
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    source: row.source || undefined,
    model: row.model || undefined,
    createdAt: row.created_at,
  };
}

/* ---------- routes ---------- */

router.get("/chat/conversations", async (req, res) => {
  try {
    const db = await getDb();
    const rows = queryAll(db,
      "SELECT * FROM chat_conversations WHERE user_id = ? ORDER BY updated_at DESC",
      [req.user.sub]
    );
    res.json(rows.map(dbConversationToApi));
  } catch (err) {
    console.error("[chat:conversations:list]", err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/chat/conversations", async (req, res) => {
  try {
    const db = await getDb();
    const { title } = req.body || {};
    const id = uuid();
    runSql(db,
      "INSERT INTO chat_conversations (id, user_id, title, model, created_at, updated_at) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))",
      [id, req.user.sub, String(title || "گفتگوی جدید"), null]
    );
    const row = queryOne(db, "SELECT * FROM chat_conversations WHERE id = ?", [id]);
    res.json({ ok: true, data: dbConversationToApi(row) });
  } catch (err) {
    console.error("[chat:conversations:create]", err);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

router.get("/chat/conversations/:id", async (req, res) => {
  try {
    const db = await getDb();
    const convo = queryOne(db, "SELECT * FROM chat_conversations WHERE id = ? AND user_id = ?", [req.params.id, req.user.sub]);
    if (!convo) return res.status(404).json({ error: "not_found" });
    const messages = queryAll(db, "SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC", [req.params.id]);
    res.json({ conversation: dbConversationToApi(convo), messages: messages.map(dbMessageToApi) });
  } catch (err) {
    console.error("[chat:conversations:get]", err);
    res.status(500).json({ error: "server_error" });
  }
});

router.patch("/chat/conversations/:id", async (req, res) => {
  try {
    const db = await getDb();
    const convo = queryOne(db, "SELECT * FROM chat_conversations WHERE id = ? AND user_id = ?", [req.params.id, req.user.sub]);
    if (!convo) return res.status(404).json({ error: "not_found" });
    const { title } = req.body || {};
    runSql(db, "UPDATE chat_conversations SET title = ?, updated_at = datetime('now') WHERE id = ?",
      [String(title || "").trim() || "گفتگوی جدید", req.params.id]);
    const row = queryOne(db, "SELECT * FROM chat_conversations WHERE id = ?", [req.params.id]);
    res.json({ ok: true, data: dbConversationToApi(row) });
  } catch (err) {
    console.error("[chat:conversations:update]", err);
    res.status(500).json({ error: "server_error" });
  }
});

router.delete("/chat/conversations/:id", async (req, res) => {
  try {
    const db = await getDb();
    const convo = queryOne(db, "SELECT * FROM chat_conversations WHERE id = ? AND user_id = ?", [req.params.id, req.user.sub]);
    if (!convo) return res.status(404).json({ error: "not_found" });
    runSql(db, "DELETE FROM chat_messages WHERE conversation_id = ?", [req.params.id]);
    runSql(db, "DELETE FROM chat_conversations WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("[chat:conversations:delete]", err);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/chat/conversations/:id/messages", async (req, res) => {
  try {
    const db = await getDb();
    const convo = queryOne(db, "SELECT * FROM chat_conversations WHERE id = ? AND user_id = ?", [req.params.id, req.user.sub]);
    if (!convo) return res.status(404).json({ error: "not_found" });
    const { role, content, source, model } = req.body || {};
    if (!role || !["user", "assistant"].includes(role)) return res.status(400).json({ error: "bad_request" });
    if (!content || !String(content).trim()) return res.status(400).json({ error: "bad_request" });
    const id = uuid();
    runSql(db,
      "INSERT INTO chat_messages (id, conversation_id, role, content, source, model, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))",
      [id, req.params.id, role, String(content).trim(), source || null, model || null]
    );
    runSql(db, "UPDATE chat_conversations SET updated_at = datetime('now') WHERE id = ?", [req.params.id]);
    const row = queryOne(db, "SELECT * FROM chat_messages WHERE id = ?", [id]);
    res.json({ ok: true, data: dbMessageToApi(row) });
  } catch (err) {
    console.error("[chat:messages:create]", err);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

export default router;
