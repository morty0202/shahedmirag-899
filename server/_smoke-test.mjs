/**
 * Smoke test — starts server.mjs, hits every new endpoint, prints results, exits.
 * Run: node _smoke-test.mjs
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER = join(__dirname, "server.mjs");
const BASE = "http://127.0.0.1:3001";

let failures = 0;
const ok = (cond, label) => {
  console.log(`${cond ? "✓" : "✗"} ${label}`);
  if (!cond) failures++;
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function json(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

const child = spawn(process.execPath, [SERVER], { cwd: __dirname, stdio: "ignore" });

async function main() {
  // wait for server to boot
  let up = false;
  for (let i = 0; i < 25; i++) {
    try {
      const r = await fetch(`${BASE}/healthz`);
      if (r.ok) { up = true; break; }
    } catch { /* not up yet */ }
    await wait(400);
  }
  ok(up, "server booted (healthz reachable)");
  if (!up) {
    console.log("server failed to start — aborting");
    process.exit(1);
  }

  // login as teacher + admin
  const t = await json("/api/auth/login", { method: "POST", body: JSON.stringify({ username: "ahmadi", password: "Teacher1404@" }) });
  ok(t.status === 200 && !!t.body.data?.token, "teacher login (ahmadi)");
  const admin = await json("/api/auth/login", { method: "POST", body: JSON.stringify({ username: "admin", password: "Admin1404@" }) });
  ok(admin.status === 200 && !!admin.body.data?.token, "admin login (admin)");

  const auth = { Authorization: `Bearer ${t.body.data.token}` };
  const adminAuth = { Authorization: `Bearer ${admin.body.data.token}` };

  const bad = await json("/api/auth/login", { method: "POST", body: JSON.stringify({ username: "admin", password: "wrong" }) });
  ok(bad.status === 200 && bad.body.ok === false && bad.body.error === "invalid_credentials", "wrong password rejected");

  // session restore
  const sess = await json("/api/auth/session", { headers: auth });
  ok(sess.status === 200 && sess.body.session?.user?.username === "ahmadi", "session restore works");

  // classrooms
  const sessions = await json("/api/classrooms/sessions", { headers: auth });
  ok(sessions.status === 200 && Array.isArray(sessions.body), "classroom sessions list");

  // education
  const edu = await json("/api/education/items?grade=11", { headers: auth });
  ok(edu.status === 200 && Array.isArray(edu.body) && edu.body.length > 0, `education items (grade 11) = ${edu.body.length}`);

  // teacher upload
  const upResp = await json("/api/education/items", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      gradeId: "10", classroomId: "math-10", title: "تست آپلود",
      kind: "file", name: "test.pdf", sizeLabel: "۱ کیلوبایت", sizeBytes: 1000,
      mime: "application/pdf", dataUrl: "data:application/pdf;base64,QUJD",
    }),
  });
  ok(upResp.status === 200 && upResp.body.ok === true && !!upResp.body.data?.id, "teacher upload education item");
  if (upResp.body.data?.id) {
    const del = await json(`/api/education/items/${upResp.body.data.id}`, { method: "DELETE", headers: auth });
    ok(del.status === 200, "delete education item");
  }

  // content
  const honors = await json("/api/honors", { headers: auth });
  ok(honors.status === 200 && honors.body.length >= 3, `honors list = ${honors.body.length}`);
  const trips = await json("/api/field-trips", { headers: auth });
  ok(trips.status === 200 && trips.body.length >= 1, `field trips list = ${trips.body.length}`);
  const ann = await json("/api/announcements", { headers: auth });
  ok(ann.status === 200 && ann.body.length >= 1, `announcements list = ${ann.body.length}`);
  const gal = await json("/api/gallery", { headers: adminAuth });
  ok(gal.status === 200 && gal.body.length >= 1, `gallery list = ${gal.body.length}`);

  // admin users + stats
  const usr = await json("/api/admin/users", { headers: adminAuth });
  ok(usr.status === 200 && usr.body.length >= 3, `admin users list = ${usr.body.length}`);
  const stats = await json("/api/admin/stats", { headers: adminAuth });
  ok(stats.status === 200 && stats.body?.students >= 1, "admin stats");

  // dashboard schedule
  const sched = await json("/api/dashboard/schedule", { headers: auth });
  ok(sched.status === 200 && sched.body.length === 5, `dashboard schedule = ${sched.body.length}`);

  // assistant
  const chat = await json("/api/assistant/chat", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ message: "قوانین حرکت نیوتن را توضیح بده" }),
  });
  ok(chat.status === 200 && chat.body.data?.reply?.length > 20, "assistant chat returns a reply");

  // settings get + patch (idempotent — accepts whatever value is currently stored)
  const settings = await json("/api/settings", { headers: auth });
  ok(
    settings.status === 200 &&
      (settings.body.data?.theme === "dark" || settings.body.data?.theme === "light"),
    "settings get returns a valid theme"
  );
  const patched = await json("/api/settings", {
    method: "PATCH", headers: auth,
    body: JSON.stringify({ theme: "light", notifyTrips: true }),
  });
  ok(patched.status === 200 && patched.body.data?.theme === "light" && patched.body.data?.notifyTrips === true, "settings patch");
  // restore dark so re-runs stay consistent
  await json("/api/settings", {
    method: "PATCH", headers: auth,
    body: JSON.stringify({ theme: "dark", notifyTrips: false }),
  });

  // unauthorized access rejected
  const noAuth = await json("/api/honors");
  ok(noAuth.status === 401, "content endpoints require auth");

  console.log(failures === 0 ? "\n✅ ALL SMOKE TESTS PASSED" : `\n❌ ${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error("SMOKE TEST CRASH:", e);
  child.kill();
  process.exit(1);
});

function shutdown(code) {
  child.kill();
  process.exit(code);
}
process.on("exit", () => child.kill());
process.on("SIGINT", () => shutdown(2));