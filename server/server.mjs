/**
 * Combined REST + WebSocket signaling server for the Meraj school platform.
 *
 * REST API (Express):
 *   /api/auth/*      — Authentication (register, login, session, reset, etc.)
 *   /api/admin/*     — Admin user management (CRUD, stats)
 *   /api/classrooms/* — Classroom sessions & attendance
 *
 * WebSocket (ws):
 *   /signal?ticket=  — WebRTC signaling (join, relay, presence)
 *
 * Environment:
 *   PORT (default 3001)
 *   SIGNAL_SECRET (required in production)
 *   ALLOWED_ORIGIN (CORS, default *)
 *   TURN_URL, TURN_SECRET, TURN_TTL_SEC (optional)
 */

import { createServer } from "node:http";
import { createHmac, randomUUID } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";

// Load .env manually (no dotenv dependency)
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, ".env");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key] || process.env[key] === '0') process.env[key] = val;
  }
}

import { issueTicket, verifyTicket, verifyPassword } from "./auth.mjs";
import { getDb, closeDb, runSql, queryOne } from "./db.mjs";
import authRoutes from "./routes/auth.mjs";
import adminRoutes from "./routes/admin.mjs";
import classroomRoutes from "./routes/classrooms.mjs";
import educationRoutes from "./routes/education.mjs";
import contentRoutes from "./routes/content.mjs";
import dashboardRoutes from "./routes/dashboard.mjs";
import settingsRoutes from "./routes/settings.mjs";
import assistantRoutes from "./routes/assistant.mjs";
import notificationsRoutes from "./routes/notifications.mjs";
import scheduleRoutes from "./routes/schedule.mjs";
import chatHistoryRoutes from "./routes/chatHistory.mjs";

/* ---- Config ---- */

const PORT = 3001;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const HEARTBEAT_MS = 30_000;

/* ---- Express app ---- */

const app = express();

app.use(cors({
  origin: ALLOWED_ORIGIN,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["content-type", "authorization"],
}));
app.use(express.json({ limit: "30mb" }));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/classrooms", classroomRoutes);
app.use("/api/education", educationRoutes);
app.use("/api", contentRoutes); // /api/announcements, /api/honors, /api/field-trips, /api/gallery
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/assistant", assistantRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/chat", chatHistoryRoutes);

// Health check
app.get("/healthz", (req, res) => {
  res.json({ ok: true, rooms: rooms.size });
});

// ICE config endpoint
app.get("/api/ice", (req, res) => {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token || !verifyTicket(token)) return res.status(401).json({ error: "unauthorized" });
  res.json({ iceServers: iceServers() });
});

// Ticket login for WebSocket signaling (DB-backed — same users as REST login)
app.post("/api/auth/ticket", async (req, res) => {
  try {
    const db = await getDb();
    const uname = String((req.body || {}).username || "").trim().toLowerCase();
    const row = queryOne(db, "SELECT * FROM users WHERE username = ?", [uname]);
    if (!row || !(await verifyPassword((req.body || {}).password || "", row.password_hash))) {
      return res.status(401).json({ error: "نام کاربری یا رمز عبور نادرست است" });
    }
    const identity = { userId: row.id, name: `${row.first_name} ${row.last_name}`, role: row.role };
    res.json({ token: issueTicket(identity), expiresIn: 12 * 60 * 60, user: identity });
  } catch (err) {
    console.error("[auth:ticket]", err);
    res.status(500).json({ error: "server_error" });
  }
});

/* ---- HTTP server + WebSocket ---- */

const httpServer = createServer(app);

/* ---- ICE: STUN public, TURN credentials minted here ---- */

function iceServers() {
  const servers = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
  if (process.env.TURN_URL && process.env.TURN_SECRET) {
    const ttl = Number(process.env.TURN_TTL_SEC || 6 * 3600);
    const username = String(Math.floor(Date.now() / 1000) + ttl);
    const credential = createHmac("sha1", process.env.TURN_SECRET).update(username).digest("base64");
    servers.push({ urls: process.env.TURN_URL.split(","), username, credential });
  }
  return servers;
}

/* ---- rooms & connections ---- */

/** roomCode -> Map<connId, {ws, info}> */
const rooms = new Map();
/** connId -> {ws, info, roomCode, alive} */
const connections = new Map();

function joinRoom(connId, ws, info, roomCode) {
  const prev = connections.get(connId);
  if (prev?.roomCode) leaveRoom(connId, "switched");

  const room = rooms.get(roomCode) ?? new Map();
  rooms.set(roomCode, room);
  room.set(connId, { ws, info });
  connections.set(connId, { ws, info, roomCode, alive: true });

  // tell the joiner who is already here
  for (const [peerId, peer] of room) {
    if (peerId === connId) continue;
    send(ws, { t: "presence", event: "join", peer: { peerId, ...peer.info } });
  }
  // tell everyone else about the joiner
  broadcast(roomCode, { t: "presence", event: "join", peer: { peerId: connId, ...info } }, connId);
  send(ws, { t: "joined", selfId: connId });
  console.log(`[room ${roomCode}] + ${info.name} (${info.role}) — ${room.size} online`);

  // Record attendance (fire-and-forget)
  getDb().then(db => {
    try {
      runSql(db, "INSERT INTO attendance (room_code, name, role, type, at) VALUES (?, ?, ?, 'join', ?)",
        [roomCode, info.name, info.role, Date.now()]);
    } catch {}
  }).catch(() => {});
}

function leaveRoom(connId, reason) {
  const conn = connections.get(connId);
  if (!conn?.roomCode) return;
  const room = rooms.get(conn.roomCode);
  if (room) {
    room.delete(connId);
    if (room.size === 0) rooms.delete(conn.roomCode);
    else broadcast(conn.roomCode, { t: "presence", event: "leave", peer: { peerId: connId, name: conn.info.name, role: conn.info.role } });
  }
  console.log(`[room ${conn.roomCode}] - ${conn.info.name} (${reason})`);

  // Record leave (fire-and-forget)
  getDb().then(db => {
    try {
      runSql(db, "INSERT INTO attendance (room_code, name, role, type, at) VALUES (?, ?, ?, 'leave', ?)",
        [conn.roomCode, conn.info.name, conn.info.role, Date.now()]);
    } catch {}
  }).catch(() => {});

  conn.roomCode = null;
}

function broadcast(roomCode, payload, exceptConnId) {
  const room = rooms.get(roomCode);
  if (!room) return;
  for (const [peerId, peer] of room) {
    if (peerId === exceptConnId) continue;
    if (peer.ws.readyState === peer.ws.OPEN) peer.ws.send(JSON.stringify(payload));
  }
}

function send(ws, payload) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload));
}

/* ---- WebSocket endpoint /signal?ticket=... ---- */

const wss = new WebSocketServer({ noServer: true });

httpServer.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname !== "/signal") {
    socket.destroy();
    return;
  }
  const claims = verifyTicket(url.searchParams.get("ticket"));
  if (!claims) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req, claims);
  });
});

wss.on("connection", (ws, req, claims) => {
  const connId = randomUUID();
  const info = { userId: claims.sub, name: claims.name, role: claims.role };
  connections.set(connId, { ws, info, roomCode: null, alive: true });
  send(ws, { t: "hello", selfId: connId, ice: { iceServers: iceServers() } });

  ws.on("pong", () => {
    const conn = connections.get(connId);
    if (conn) conn.alive = true;
  });

  // Persistent handler: process all messages including join
  let joined = false;
  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    const conn = connections.get(connId);
    if (!conn) return;

    // Handle join (only before joined)
    if (!joined && msg?.t === "join" && typeof msg.room === "string" && /^[A-Z0-9-]{4,16}$/.test(msg.room)) {
      joined = true;
      joinRoom(connId, ws, info, msg.room);
      return;
    }

    // Handle relay (must be in a room)
    if (!conn.roomCode) return;
    if (msg?.t !== "relay" || !msg.msg || typeof msg.msg !== "object") return;

    const room = rooms.get(conn.roomCode);
    if (!room) return;

    const envelope = { t: "relay", from: connId, msg: msg.msg };
    if (msg.to) {
      const target = room.get(msg.to);
      if (target) send(target.ws, envelope);
    } else {
      broadcast(conn.roomCode, envelope, connId);
    }
  });

  ws.on("close", () => {
    leaveRoom(connId, "closed");
    connections.delete(connId);
  });

  ws.on("error", () => {
    leaveRoom(connId, "error");
    connections.delete(connId);
  });
});

/* ---- heartbeat ---- */

setInterval(() => {
  for (const [connId, conn] of connections) {
    if (!conn.alive) {
      conn.ws.terminate();
      leaveRoom(connId, "heartbeat-timeout");
      connections.delete(connId);
      continue;
    }
    conn.alive = false;
    conn.ws.ping();
  }
}, HEARTBEAT_MS);

/* ---- start ---- */

// Initialize database then start server
getDb().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`[server] REST API:  http://localhost:${PORT}/api`);
    console.log(`[server] WebSocket: ws://localhost:${PORT}/signal`);
    console.log(`[server] Health:    http://localhost:${PORT}/healthz`);
  });
}).catch(err => {
  console.error("[server] Failed to initialize database:", err);
  process.exit(1);
});

/* ---- graceful shutdown ---- */

process.on("SIGINT", () => {
  console.log("\n[server] Shutting down...");
  closeDb();
  process.exit(0);
});

process.on("SIGTERM", () => {
  closeDb();
  process.exit(0);
});
