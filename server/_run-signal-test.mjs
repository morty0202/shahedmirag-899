/**
 * Runs server.mjs and executes the signaling flow test against it.
 * Run: node _run-signal-test.mjs
 */
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER = join(__dirname, "server.mjs");
const FLOW = join(__dirname, "test-flow.mjs");
const OUT = join(__dirname, "signal-test-output.txt");
const BASE = "http://127.0.0.1:3001";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

writeFileSync(OUT, "");
const log = (...a) => {
  writeFileSync(OUT, a.join(" ") + "\n", { flag: "a" });
  console.log(...a);
};

const server = spawn(process.execPath, [SERVER], { cwd: __dirname, stdio: "ignore" });

async function main() {
  let up = false;
  for (let i = 0; i < 30; i++) {
    try {
      const r = await fetch(`${BASE}/healthz`);
      if (r.ok) { up = true; break; }
    } catch { /* not yet */ }
    await wait(400);
  }
  if (!up) {
    log("[runner] server did not boot — aborting");
    server.kill();
    process.exit(1);
  }
  log("[runner] server up — running signaling flow test\n");

  const output = [];

  const flow = spawn(process.execPath, [FLOW], {
    cwd: __dirname,
    env: { ...process.env, SIGNAL_TEST_URL: BASE },
  });
  flow.stdout.on("data", (d) => output.push(d.toString()));
  flow.stderr.on("data", (d) => output.push(d.toString()));

  const killer = setTimeout(() => {
    log("[runner] TIMEOUT — killing flow test");
    flow.kill("SIGKILL");
  }, 40000);

  flow.on("exit", (code) => {
    clearTimeout(killer);
    server.kill();
    writeFileSync(OUT, output.join(""));
    console.log(output.join(""));
    log(`\n[runner] signaling test exited with code ${code}`);
    process.exit(code ?? 1);
  });
}

main().catch((e) => {
  console.error(e);
  server.kill();
  process.exit(1);
});
process.on("exit", () => server.kill());
process.on("SIGINT", () => process.exit(2));