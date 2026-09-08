/**
 * End-to-end signaling test against the real server — no BroadcastChannel.
 *
 * Simulates two users on two separate connections (like two computers):
 *   1. ticket login for amir (student) + ahmadi (teacher)
 *   2. both join room ABCD1234 over independent WebSockets
 *   3. presence: each sees the other join
 *   4. relay: offer/answer/ICE/chat exchanged both directions
 *   5. isolation: a third client in room ZZZZ9999 receives nothing from ABCD1234
 *   6. leave: presence leave delivered; server cleans up
 *
 * Run: node server/test-flow.mjs   (server must be running on :8081)
 */

import { randomUUID } from "node:crypto";

const BASE = process.env.SIGNAL_TEST_URL || "http://127.0.0.1:8081";
let failures = 0;
const ok = (cond, label) => {
  console.log(`${cond ? "✓" : "✗"} ${label}`);
  if (!cond) failures++;
};

async function login(username, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(`login failed for ${username}: ${res.status}`);
  const body = await res.json();
  // combined server: { ok, data: { token } } — standalone: { token }
  const token = body?.token ?? body?.data?.token;
  if (!token) throw new Error(`login returned no token for ${username}`);
  return token;
}

function connect(token) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${BASE.replace("http", "ws")}/signal?ticket=${encodeURIComponent(token)}`);
    const messages = [];
    const waiters = [];
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      messages.push(msg);
      for (let i = waiters.length - 1; i >= 0; i--) {
        if (waiters[i](msg)) waiters.splice(i, 1);
      }
    };
    ws.onerror = () => reject(new Error("ws error"));
    const api = {
      ws,
      messages,
      waitFor(predicate, label, timeoutMs = 4000) {
        const existing = messages.find(predicate);
        if (existing) return Promise.resolve(existing);
        return new Promise((res, rej) => {
          const t = setTimeout(() => rej(new Error(`timeout waiting: ${label}`)), timeoutMs);
          waiters.push((m) => {
            if (predicate(m)) {
              clearTimeout(t);
              res(m);
              return true;
            }
            return false;
          });
        });
      },
    };
    // wait for hello
    waiters.push((m) => {
      if (m.t === "hello") {
        api.selfId = m.selfId;
        api.ice = m.ice;
        resolve(api);
        return true;
      }
      return false;
    });
  });
}

console.log(`\n▶ signaling flow test against ${BASE}\n`);

try {
  /* 1 — bad credentials rejected */
  const bad = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "amir", password: "wrong" }),
  });
  const badBody = await bad.json().catch(() => ({}));
  const rejected = bad.status === 401 || (bad.ok && badBody?.ok === false);
  ok(rejected, "wrong password rejected");

  /* 2 — tickets for two users */
  const amirToken = await login("amir", "Amir1404@");
  const ahmadiToken = await login("ahmadi", "Teacher1404@");
  ok(!!amirToken && !!ahmadiToken, "tickets issued for student + teacher");

  /* 3 — ws auth enforced */
  const noAuth = new WebSocket(`${BASE.replace("http", "ws")}/signal`);
  const noAuthRejected = await new Promise((res) => {
    noAuth.onerror = () => res(true);
    noAuth.onopen = () => res(false);
  });
  ok(noAuthRejected, "websocket without ticket rejected");

  /* 4 — two independent connections join room ABCD1234 */
  const A = await connect(amirToken);
  const B = await connect(ahmadiToken);
  ok(A.selfId !== B.selfId, "server assigned distinct peer ids");

  A.ws.send(JSON.stringify({ t: "join", room: "ABCD1234" }));
  B.ws.send(JSON.stringify({ t: "join", room: "ABCD1234" }));

  await B.waitFor((m) => m.t === "presence" && m.event === "join" && m.peer.name === "امیر نجفی", "B sees A join");
  ok(true, "B received presence join for A (student)");
  await A.waitFor((m) => m.t === "presence" && m.event === "join" && m.peer.name === "رضا احمدی", "A sees B join");
  ok(true, "A received presence join for B (teacher)");
  ok(A.ice.iceServers.length >= 1, "ICE (STUN) config delivered on hello");

  /* 5 — SDP/ICE relay both directions */
  A.ws.send(JSON.stringify({ t: "relay", to: B.selfId, msg: { type: "offer", from: A.selfId, to: B.selfId, sdp: { type: "offer", sdp: "x" } } }));
  const offer = await B.waitFor((m) => m.t === "relay" && m.msg.type === "offer", "B receives offer");
  ok(offer.from === A.selfId, "offer relayed A→B with correct source id");

  B.ws.send(JSON.stringify({ t: "relay", to: A.selfId, msg: { type: "answer", from: B.selfId, to: A.selfId, sdp: { type: "answer", sdp: "y" } } }));
  await A.waitFor((m) => m.t === "relay" && m.msg.type === "answer", "A receives answer");
  ok(true, "answer relayed B→A");

  A.ws.send(JSON.stringify({ t: "relay", to: B.selfId, msg: { type: "ice", from: A.selfId, to: B.selfId, cand: { candidate: "candidate:1" } } }));
  const ice = await B.waitFor((m) => m.t === "relay" && m.msg.type === "ice", "B receives ICE");
  ok(ice.msg.cand.candidate === "candidate:1", "ICE candidate relayed intact");

  /* 6 — broadcast chat */
  A.ws.send(JSON.stringify({ t: "relay", msg: { type: "chat", from: A.selfId, name: "امیر نجفی", role: "student", text: "سلام", ts: Date.now() } }));
  await B.waitFor((m) => m.t === "relay" && m.msg.type === "chat" && m.msg.text === "سلام", "B receives chat");
  ok(true, "broadcast chat relayed to room");

  /* 7 — room isolation */
  const C = await connect(amirToken);
  C.ws.send(JSON.stringify({ t: "join", room: "ZZZZ9999" }));
  await C.waitFor((m) => m.t === "joined", "C joined other room");
  A.ws.send(JSON.stringify({ t: "relay", msg: { type: "chat", from: A.selfId, text: "secret-room-a", ts: Date.now() } }));
  await new Promise((r) => setTimeout(r, 600));
  ok(!C.messages.some((m) => m.t === "relay" && m.msg?.text === "secret-room-a"), "room B never receives room A traffic");
  ok(!C.messages.some((m) => m.t === "presence" && m.peer?.name === "رضا احمدی"), "room B never sees room A presence");

  /* 8 — leave + cleanup */
  const A_id = A.selfId;
  A.ws.close();
  await B.waitFor((m) => m.t === "presence" && m.event === "leave" && m.peer.peerId === A_id, "B sees A leave");
  ok(true, "leave presence delivered on disconnect");
  B.ws.close();
  C.ws.close();

  const health = await (await fetch(`${BASE}/healthz`)).json();
  console.log(`  (server rooms after test: ${health.rooms})`);
  console.log(failures === 0 ? "\n✅ ALL SIGNALING TESTS PASSED\n" : `\n❌ ${failures} test(s) failed\n`);
  process.exit(failures === 0 ? 0 : 1);
} catch (e) {
  console.error("\n❌ test crashed:", e.message, "\n");
  process.exit(1);
}
