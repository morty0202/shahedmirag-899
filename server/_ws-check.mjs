/**
 * Minimal WebSocket sanity check against server.mjs using the ws package
 * (the same client library the real browser build uses under the hood).
 * Run: node _ws-check.mjs
 */
import { spawn } from "node:child_process";
import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import WebSocket from "ws";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER = join(__dirname, "server.mjs");
const BASE = "http://127.0.0.1:3001";
const OUT = join(__dirname, "ws-check-output.txt");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

writeFileSync(OUT, "");
let server;

const logToFile = (t) => writeFileSync(OUT, t + "\n", { flag: "a" });

async function login(username, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const body = await res.json();
  return body?.token ?? body?.data?.token;
}

async function main() {
  server = spawn(process.execPath, [SERVER], { cwd: __dirname, stdio: "ignore" });
  let up = false;
  for (let i = 0; i < 30; i++) {
    try { if ((await fetch(`${BASE}/healthz`)).ok) { up = true; break; } } catch {}
    await wait(400);
  }
  if (!up) { logToFile("server did not boot"); process.exit(1); }

  const tokens = [await login("amir", "Amir1404@"), await login("ahmadi", "Teacher1404@")];
  if (!tokens[0] || !tokens[1]) { logToFile("login failed"); process.exit(1); }
  logToFile("login ok");

  const clients = tokens.map((token) =>
    new WebSocket(`${BASE.replace("http", "ws")}/signal?ticket=${encodeURIComponent(token)}`)
  );

  const messages = [[], []];

  await new Promise((resolve, reject) => {
    let got = 0;
    clients.forEach((ws, i) => {
      ws.on("error", (e) => logToFile(`client${i} error: ${e.message}`));
      ws.on("open", () => {
        logToFile(`client${i} open`);
        if (++got === 2) resolve();
      });
      ws.on("message", (raw) => {
        const m = JSON.parse(raw.toString());
        messages[i].push(m);
        if (m.t === "hello") logToFile(`client${i} hello selfId=${m.selfId}`);
      });
    });
    setTimeout(() => reject(new Error("open timeout")), 5000);
  });

  clients[0].send(JSON.stringify({ t: "join", room: "ABCD1234" }));
  logToFile("A sent join");
  clients[1].send(JSON.stringify({ t: "join", room: "ABCD1234" }));
  logToFile("B sent join");

  await wait(1500);

  logToFile(`A messages: ${messages[0].map((m) => m.t).join(",")}`);
  logToFile(`B messages: ${messages[1].map((m) => m.t).join(",")}`);

  for (const m of messages[1]) {
    if (m.t === "presence") logToFile(`B presence event=${m.event} peer=${JSON.stringify(m.peer)}`);
  }
  if (messages[0].find((m) => m.t === "presence")) logToFile(`A presence: ${JSON.stringify(messages[0].find((m) => m.t === "presence").peer)}`);

  const bHasPresenceA = messages[1].some(
    (m) => m.t === "presence" && m.event === "join" && m.peer?.name === "امیر نجفی"
  );
  logToFile(bHasPresenceA ? "ok — B saw A presence" : "FAIL — B did NOT see A presence");

  clients.forEach((c) => c.close());
  process.exit(bHasPresenceA ? 0 : 1);
}

main().catch((e) => {
  logToFile("WS CHECK ERROR: " + e.message);
  process.exit(1);
});
process.on("exit", () => { if (server) server.kill(); });