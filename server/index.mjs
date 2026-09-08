/**
 * Real WebSocket signaling server for the Meraj online classroom.
 *
 * Responsibilities (and nothing else — media flows P2P via WebRTC):
 *   - ticket auth (POST /api/auth/login, identity verified server-side)
 *   - room membership & presence (join/leave events, per-room isolation)
 *   - opaque relay of offer/answer/ICE/chat/control messages inside a room
 *   - heartbeat + cleanup of dead connections
 *   - ICE (STUN/TURN) config distribution with server-side TURN secrets
 *
 * Env:
 *   SIGNAL_PORT (default 8081)  SIGNAL_SECRET (required in production)
 *   ALLOWED_ORIGIN (CORS, e.g. http://localhost:5175)
 *   TURN_URL, TURN_SECRET, TURN_TTL_SEC  (optional, coturn REST credentials)
 */

import { createServer } from "node:http";
import { createHmac, randomUUID } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { WebSocketServer } from "ws";
import { issueTicket, verifyTicket, verifyPassword } from "./auth.mjs";
import { getDb, queryOne } from "./db.mjs";

// Load server/.env manually (no dotenv dependency)
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
    if (!process.env[key]) process.env[key] = val;
  }
}

const PORT = Number(process.env.SIGNAL_PORT || 8081);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const HEARTBEAT_MS = 30_000;

/* ---------------- HTTP: health, ticket login, ICE config ---------------- */

const httpServer = createServer((req, res) => {
  const cors = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "content-type, authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") return res.writeHead(204).end();

  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/healthz") return json(res, 200, { ok: true, rooms: rooms.size });

  if (url.pathname === "/api/auth/login" && req.method === "POST") {
    return readBody(req, async (body) => {
      try {
        const db = await getDb();
        const uname = String(body.username || "").trim().toLowerCase();
        const row = queryOne(db, "SELECT * FROM users WHERE username = ?", [uname]);
        if (!row || !(await verifyPassword(body.password || "", row.password_hash))) {
          return json(res, 401, { error: "نام کاربری یا رمز عبور نادرست است" });
        }
        const identity = { userId: row.id, name: `${row.first_name} ${row.last_name}`, role: row.role };
        return json(res, 200, {
          token: issueTicket(identity),
          expiresIn: 12 * 60 * 60,
          user: identity,
        });
      } catch (err) {
        console.error("[login]", err);
        return json(res, 500, { error: "server_error" });
      }
    });
  }

  if (url.pathname === "/api/ice" && req.method === "GET") {
    const claims = bearerClaims(req);
    if (!claims) return json(res, 401, { error: "unauthorized" });
    return json(res, 200, { iceServers: iceServers() });
  }

  return json(res, 404, { error: "not found" });
});

function json(res, status, obj) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(obj));
}

function readBody(req, cb) {
  let data = "";
  req.on("data", (c) => {
    data += c;
    if (data.length > 1e6) req.destroy();
  });
  req.on("end", () => {
    let body = {};
    try {
      body = JSON.parse(data || "{}");
    } catch {}
    cb(body);
  });
}

function bearerClaims(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  return token ? verifyTicket(token) : null;
}

/* ---------------- ICE: STUN public, TURN credentials minted here ---------------- */

function iceServers() {
  const servers = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
  if (process.env.TURN_URL && process.env.TURN_SECRET) {
    // coturn "REST API" credentials: username = expiry epoch, credential = HMAC(secret, username).
    // TURN_SECRET itself never leaves the server.
    const ttl = Number(process.env.TURN_TTL_SEC || 6 * 3600);
    const username = String(Math.floor(Date.now() / 1000) + ttl);
    const credential = createHmac("sha1", process.env.TURN_SECRET).update(username).digest("base64");
    servers.push({ urls: process.env.TURN_URL.split(","), username, credential });
  }
  return servers;
}

/* ---------------- rooms & connections ---------------- */

/** roomCode -> Map<connId, {ws, info}> */
const rooms = new Map();
/** connId -> {ws, info, roomCode, alive} */
const connections = new Map();

function joinRoom(connId, ws, info, roomCode) {
  // a connection lives in exactly one room at a time
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

/* ---------------- WebSocket endpoint /signal?ticket=... ---------------- */

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
  // identity comes ONLY from the verified ticket
  const connId = randomUUID();
  const info = { userId: claims.sub, name: claims.name, role: claims.role };
  connections.set(connId, { ws, info, roomCode: null, alive: true });
  send(ws, { t: "hello", selfId: connId, ice: { iceServers: iceServers() } });

  ws.on("pong", () => {
    const conn = connections.get(connId);
    if (conn) conn.alive = true;
  });

  ws.on("message", (raw) => {
    const conn = connections.get(connId);
    if (!conn?.roomCode) return; // must join a room first
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
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

  // join message is the only thing accepted before relay
  ws.once("message", (raw) => {
    try {
      const first = JSON.parse(raw.toString());
      if (first?.t === "join" && typeof first.room === "string" && /^[A-Z0-9-]{4,16}$/.test(first.room)) {
        joinRoom(connId, ws, info, first.room);
      }
    } catch {}
  });
});

/* ---------------- heartbeat ---------------- */

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

httpServer.listen(PORT, () => {
  console.log(`[signaling] listening on ws://0.0.0.0:${PORT}/signal`);
  console.log(`[signaling] ticket login: POST http://localhost:${PORT}/api/auth/login`);
});
