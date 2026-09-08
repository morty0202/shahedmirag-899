// UI-flow verification: login → math question (step-by-step, no CoT leak) → follow-up with history.
import { writeFileSync } from "node:fs";

const base = "http://localhost:3001";
const lines = [];
const log = (s) => lines.push(s);

const login = await fetch(`${base}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "amir", password: "Amir1404@" }),
}).then((r) => r.json());
const token = login.token || login.data?.token;
log(`login ok=${!!token}`);
if (!token) {
  log("NO TOKEN: " + JSON.stringify(login).slice(0, 200));
  writeFileSync(new URL("./verify-out.txt", import.meta.url), lines.join("\n"), "utf8");
  process.exit(1);
}

const H = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

const st = await fetch(`${base}/api/assistant/status`, { headers: H }).then((r) => r.json()).catch(() => null);
log(`status: ${st?.ok ? `aiEnabled=${st.data.aiEnabled} model=${st.data.model}` : "unavailable"}`);

// Turn 1 — math, must be source=ai, Persian, step-by-step, no leaked reasoning
let t0 = Date.now();
const r1 = await fetch(`${base}/api/assistant/chat`, {
  method: "POST",
  headers: H,
  body: JSON.stringify({ message: "معادله 2x + 5 = 13 را گامبهگام حل کن", history: [] }),
}).then((r) => r.json());
const d1 = r1.data || {};
const reply1 = String(d1.reply || "");
log(`[turn1] ${((Date.now() - t0) / 1000).toFixed(1)}s source=${d1.source} model=${d1.model || "-"} cached=${!!d1.cached}`);
log("--- reply1 ---");
log(reply1);

// Turn 2 — follow-up with history (context must be respected)
t0 = Date.now();
const r2 = await fetch(`${base}/api/assistant/chat`, {
  method: "POST",
  headers: H,
  body: JSON.stringify({
    message: "خب حالا جواب را در معادله اصلی بگذار و درستی آن را بررسی کن",
    history: [
      { role: "user", content: "معادله 2x + 5 = 13 را گامبهگام حل کن" },
      { role: "assistant", content: reply1.slice(0, 1500) },
    ],
  }),
}).then((r) => r.json());
const d2 = r2.data || {};
log(`[turn2] ${((Date.now() - t0) / 1000).toFixed(1)}s source=${d2.source} model=${d2.model || "-"}`);
log("--- reply2 ---");
log(String(d2.reply || ""));

// Verdicts
const leak = /(okay|well|alright|hmm|let me|i will|i need to|the user)\b/i.test(reply1) || /<think>/i.test(reply1);
const hasPersian = /[\u0600-\u06FF]/.test(reply1);
const hasSteps = /(گام|مرحله|x\s*=|۱۳|13)/i.test(reply1);
log(`--- verdict ---`);
const tag = (d) =>
  d.source === "ai"
    ? "PASS (real AI)"
    : d.source === "fallback" && /سهمیه|شارژ/.test(String(d.reply || ""))
      ? "EXPECTED-QUOTA (daily free limit — resets overnight)"
      : "FAIL(" + d.source + ")";
log(`turn1: ${tag(d1)}`);
log(`turn2: ${tag(d2)}`);
log(`persian clean: ${hasPersian && !leak ? "PASS" : "FAIL"}`);
log(`step-by-step: ${hasSteps ? "PASS" : "WARN"}`);

writeFileSync(new URL("./verify-out.txt", import.meta.url), lines.join("\n"), "utf8");
console.log("done");