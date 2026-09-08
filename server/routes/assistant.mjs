/**
 * Assistant routes — AI chat for the Shahid Meraj school platform.
 *
 *   GET  /api/assistant/status  → { aiEnabled, model }
 *   POST /api/assistant/chat    → { reply, source: "ai" | "fallback", model? }
 *
 * Real replies come from OpenRouter (OpenAI-compatible) using a chain of
 * free models. The offline fallback is used ONLY when every model fails.
 * The API key lives in server/.env and never reaches the client.
 */

import { Router } from "express";
import { verifyTicket } from "../auth.mjs";

const router = Router();

function requireAuth(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  const claims = token ? verifyTicket(token) : null;
  if (!claims) return res.status(401).json({ error: "unauthorized" });
  req.user = claims;
  next();
}

/* ---- Config (lazy getters: ESM hoisting runs this module before .env load) ---- */
const FALLBACK_CHAIN = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "google/gemma-4-31b-it:free",
  "z-ai/glm-5.2:free",
  "minimax/minimax-m2.7:free",
  "google/gemma-4-26b-a4b-it:free",
];
const apiKey = () => process.env.OPENAI_API_KEY || "";
const apiBase = () =>
  (process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/+$/, "");
const primaryModel = () => process.env.OPENAI_MODEL || FALLBACK_CHAIN[0];
const modelChain = () => [primaryModel(), ...FALLBACK_CHAIN.filter((m) => m !== primaryModel())];
const totalDeadlineMs = () => Number(process.env.OPENAI_TIMEOUT_MS || 70_000);

/* ---- Jalali date for the system prompt ---- */
const JM = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];
function todayJalali() {
  const n = new Date();
  const gy = n.getFullYear(), gm = n.getMonth() + 1, gd = n.getDate();
  const gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  const yy = gy - (gy <= 1600 ? 621 : 1600);
  const gy2 = gm > 2 ? yy + 1 : yy;
  let days = 365 * yy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100)
    + Math.floor((gy2 + 399) / 400) - 80 + gd + gdm[gm - 1];
  jy += 33 * Math.floor(days / 12053); days %= 12053;
  jy += 4 * Math.floor(days / 1461); days %= 1461;
  if (days > 365) { jy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return `${jd} ${JM[jm - 1]} ${jy}`;
}

function systemPrompt() {
  return [
    "تو «دستیار معراج» هستی؛ دستیار آموزشی هوشمند سامانه مدرسه شاهد معراج (دبیرستان دوره دوم).",
    "لحن تو صمیمی، محترم و امیدوارکننده است؛ مثل معلم جوانی که به دانشآموز انگیزه میدهد. حداکثر یک ایموجی و فقط وقتی واقعاً مناسب است.",
    "همیشه فقط فارسی روان و ساده بنویس؛ اصطلاح تخصصی خارجی را فقط در صورت ضرورت و داخل پرانتز بیاور.",
    "پاسخها را کوتاه، دقیق و ساختارمند بده (در صورت لزوم فهرست کوتاه یا گامهای شمارهگذاریشده). معمولاً کمتر از ۱۲۰ کلمه؛ برای حل مسئله میتوانی کاملتر بنویسی.",
    "در مسائل ریاضی و فیزیک حل را گامبهگام و آموزشی توضیح بده، اما هرگز فرایند فکر کردن درونی، خودتحلیلی یا جملههای انگلیسی حاشیهای (مثل «Okay, ...» یا «Let me...») را در پاسخ نیاور؛ فقط پاسخ نهایی تمیز و آمادهی نمایش بنویس.",
    "پرسش نامرتبط با درس، مدرسه یا سامانه را مؤدبانه به حوزه آموزشی برگردان.",
    "اگر پرسش مبهم است، پیش از پاسخ یک سؤال کوتاه شفافسازی بپرس.",
    "به کاربر پایه تحصیلی خاصی نسبت نده مگر خودش گفته باشد.",
    `تاریخ امروز: ${todayJalali()} (تقویم شمسی).`,
  ].join("\n");
}

/* ---- Reply sanitizer: hidden reasoning must never reach the UI ---- */
function sanitizeReply(raw) {
  let text = String(raw || "").replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/^<think>[\s\S]*/i, "");
  const out = [];
  let skipping = true;
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (skipping) {
      if (!t) continue;
      if (!/[\u0600-\u06FF]/.test(t) && /^[A-Za-z]/.test(t) && out.length === 0) continue; // leaked CoT
      skipping = false;
    }
    out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/* ---- Tiny TTL cache (only context-free first turns, for instant repeats) ---- */
const cache = new Map(); // key → { reply, model, at }
const CACHE_TTL = 10 * 60_000;
const oneLine = (s, max) => String(s ?? "").trim().replace(/\s+/g, " ").slice(0, max);
function cacheGet(key) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit;
  if (hit) cache.delete(key);
  return null;
}
function cacheSet(key, reply, model) {
  if (cache.size > 200) cache.clear();
  cache.set(key, { reply, model, at: Date.now() });
}

/* ---- Concurrency limiter: protects the free tier under parallel users ---- */
const MAX_CONCURRENT = 3;
let active = 0;
const waiters = [];
async function withSlot(fn) {
  if (active >= MAX_CONCURRENT) await new Promise((res) => waiters.push(res));
  active++;
  try { return await fn(); }
  finally { active--; waiters.shift()?.(); }
}

/* ---- One attempt against one model → {ok, reply} | {ok:false, why, detail} ---- */
async function callModel(model, messages, timeoutMs) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${apiBase()}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey()}`,
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "Meraj School Platform",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.6,
        max_tokens: 900,
        reasoning: { enabled: false }, // reasoning-capable free models: answer directly, no CoT
      }),
      signal: ctrl.signal,
    });
    const text = await res.text();
    let body = null;
    try { body = JSON.parse(text); } catch { /* non-JSON body */ }
    if (!res.ok) return { ok: false, why: `http_${res.status}`, detail: body?.error?.message || text.slice(0, 160) };
    if (body?.error) return { ok: false, why: "inner_error", detail: body.error.message || body.error.code || "" };
    const reply = body?.choices?.[0]?.message?.content;
    if (!reply || !String(reply).trim()) return { ok: false, why: "empty_reply" };
    return { ok: true, reply };
  } catch (err) {
    return { ok: false, why: err.name === "AbortError" ? "timeout" : "network", detail: err.message };
  } finally {
    clearTimeout(timer);
  }
}

/** Try every model in the chain (one extra pass for transient failures) inside a shared deadline. */
const TRANSIENT = new Set(["timeout", "network", "inner_error", "empty_reply", "http_429", "http_500", "http_502", "http_503", "http_504"]);
async function chainReply(messages) {
  const deadline = Date.now() + totalDeadlineMs();
  const failures = [];
  let candidates = modelChain(); // pass 1: everything, pass 2: transient-only
  for (let pass = 0; pass < 2 && candidates.length; pass++) {
    const stillTransient = [];
    for (const model of candidates) {
      const left = deadline - Date.now();
      if (left < 8_000) { candidates = []; break; }
      const t0 = Date.now();
      const out = await callModel(model, messages, Math.min(left, 60_000));
      if (out.ok) {
        console.log(`[assistant] model=${model} pass=${pass + 1} ms=${Date.now() - t0}`);
        return { reply: sanitizeReply(out.reply), model };
      }
      failures.push(`${model}:${out.why}`);
      console.error(`[assistant] ${model} failed (${out.why}) ${out.detail || ""}`);
      if (TRANSIENT.has(out.why)) stillTransient.push(model);
    }
    candidates = stillTransient;
  }
  const quotaExhausted = failures.some((f) => f.endsWith(":http_429"));
  return { reply: null, failures, quotaExhausted };
}

/* ---- Offline fallback: used ONLY when the real AI is unreachable ---- */
function offlineReply(message, quotaExhausted = false) {
  const t = oneLine(message, 80).toLowerCase();
  if (/^(سلام|درود|هی|hi|hello)\b/.test(t)) {
    return quotaExhausted
      ? "سلام! من دستیار معراج هستم. 🌱 سهمیهی رایگان روزانهی سرویس هوشمند فعلاً تمام شده؛ کمی بعدتر دوباره سر بزن تا کامل در خدمتت باشم."
      : "سلام! من دستیار معراج هستم. 🌱 در این لحظه ارتباط با سرویس هوشمند برقرار نیست؛ چند لحظه بعد دوباره بپرس تا با کمال میل جوابت را بدهم.";
  }
  if (quotaExhausted) {
    return "سهمیهی رایگان روزانهی سرویس هوشمند تمام شده است و فعلاً نمیتوانم پاسخ جدیدی تولید کنم. 🌙 این سهمیه معمولاً نیمهشب تا صبح زود دوباره شارژ میشود؛ کمی بعدتر امتحان کن. تا آن موقع میتوانی از جزوهها و محتوای آموزشی داخل سامانه استفاده کنی.";
  }
  return "در حال حاضر ارتباط با سرویس هوشمند برقرار نیست و نتوانستم پاسخ دقیقی بیابم. لطفاً چند لحظه بعد دوباره بپرس؛ اگر سؤالت را کوتاهتر و دقیقتر بنویسی (مثلاً «حل معادله دومرحلهای») وقتی برگشتم سریعتر کمکت میکنم. 📚";
}

/** GET /status — is the real AI configured? */
router.get("/status", (req, res) => {
  res.json({ ok: true, data: { aiEnabled: !!apiKey(), model: primaryModel() } });
});

/** POST /chat — { message, history?: [{role, content}] } → { reply, source } */
router.post("/chat", async (req, res) => {
  const message = String(req.body?.message || "").trim().slice(0, 2000);
  if (!message) return res.status(400).json({ ok: false, error: "bad_request" });

  const history = Array.isArray(req.body?.history)
    ? req.body.history.slice(-12)
        .map((h) => ({
          role: h?.role === "assistant" ? "assistant" : "user",
          content: String(h?.content || "").trim().slice(0, 2000),
        }))
        .filter((h) => h.content)
    : [];

  const cacheKey = "q:" + oneLine(message, 300);
  const cached = history.length === 0 ? cacheGet(cacheKey) : null;
  if (cached) {
    return res.json({ ok: true, data: { reply: cached.reply, source: "ai", model: cached.model, cached: true } });
  }

  if (!apiKey()) {
    console.error("[assistant] no OPENAI_API_KEY — serving offline fallback");
    return res.json({ ok: true, data: { reply: offlineReply(message), source: "fallback" } });
  }

  const messages = [
    { role: "system", content: systemPrompt() },
    ...history,
    { role: "user", content: message },
  ];

  const t0 = Date.now();
  let quotaExhausted = false;
  try {
    const out = await withSlot(() => chainReply(messages));
    quotaExhausted = !!out.quotaExhausted;
    if (out.reply) {
      if (history.length === 0) cacheSet(cacheKey, out.reply, out.model);
      console.log(`[assistant] chat ok in ${Date.now() - t0}ms`);
      return res.json({ ok: true, data: { reply: out.reply, source: "ai", model: out.model } });
    }
    console.error(`[assistant] all models failed in ${Date.now() - t0}ms: ${out.failures.join(", ")}`);
  } catch (err) {
    console.error("[assistant:chat]", err);
  }
  res.json({ ok: true, data: { reply: offlineReply(message, quotaExhausted), source: "fallback" } });
});

export default router;