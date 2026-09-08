/**
 * dev:all — keeps the backend (server/server.mjs) and the Vite frontend running
 * together under ONE command:  npm run dev
 *
 *   - If a service is already up on its port, it is left alone (idempotent).
 *   - If a service exits/crashes while this script runs, it restarts it.
 *   - Ctrl+C stops both child processes.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const isWin = process.platform === "win32";
const BACKEND_HEALTH = "http://localhost:3001/healthz";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let shuttingDown = false;

async function isPortUp(port, path = "/") {
  try {
    const res = await fetch(`http://localhost:${port}${path}`, { signal: AbortSignal.timeout(1200) });
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

/* ---------------- backend ---------------- */

function spawnBackend() {
  const child = spawn("node", ["server.mjs"], {
    cwd: join(root, "server"),
    stdio: "inherit",
  });
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.log(`[dev:all] backend exited (${signal ?? code}) — restarting in 1s...`);
    setTimeout(() => {
      if (!shuttingDown) spawnBackend();
    }, 1000);
  });
  backend = child;
  return child;
}

let backend = null;

/* ---------------- frontend ---------------- */

function spawnFrontend() {
  // On Windows `npm` is npm.cmd — a batch file. child_process.spawn() can't
  // launch .cmd without a shell and throws `spawn EINVAL` (seen under
  // Git Bash / MINGW64 with Node v26). With a shell we pass ONE command
  // string (cmd.exe /d /s /c "npm run dev:web"), which also avoids the
  // DEP0190 deprecation about passing an args array with shell:true.
  const child = isWin
    ? spawn("npm run dev:web", { cwd: root, stdio: "inherit", shell: true })
    : spawn("npm", ["run", "dev:web"], { cwd: root, stdio: "inherit" });
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    console.log(`[dev:all] frontend exited (${signal ?? code}) — restarting in 1s...`);
    setTimeout(() => {
      if (!shuttingDown) spawnFrontend();
    }, 1000);
  });
  return child;
}

/* ---------------- main ---------------- */

console.log("[dev:all] checking services…");

if (await isPortUp(3001, "/healthz")) {
  console.log("[dev:all] backend already running on http://localhost:3001 (kept as-is)");
} else {
  console.log("[dev:all] starting backend: node server/server.mjs");
  spawnBackend();
  // wait for health
  let up = false;
  for (let i = 0; i < 30; i++) {
    if (await isPortUp(3001, "/healthz")) { up = true; break; }
    await sleep(400);
  }
  if (!up) {
    console.error("[dev:all] backend did not become ready on :3001 — check server/server.mjs");
    process.exit(1);
  }
  console.log("[dev:all] backend is up ✓");
}

if (await isPortUp(5173)) {
  console.log("[dev:all] frontend already running on http://localhost:5173 (kept as-is)");
} else {
  console.log("[dev:all] starting frontend…");
  spawnFrontend();
}

console.log("\n[dev:all] both services should now be running:");
console.log("   backend  → http://localhost:3001");
console.log("   site     → http://localhost:5173");
console.log("[dev:all] press Ctrl+C to stop them.\n");

// keep the process alive (backends auto-restart on crash)
const keepAlive = setInterval(() => {}, 1 << 30);

function shutdown() {
  shuttingDown = true;
  clearInterval(keepAlive);
  if (backend) { try { backend.kill(); } catch { /* ignore */ } }
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);