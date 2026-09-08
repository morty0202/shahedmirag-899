import { useEffect, useMemo, useState } from "react";
import { getTodaySchedule, type ScheduleItem } from "../../lib/api/dashboard";
import { toFa } from "../../utils/fa";

const statusMeta: Record<string, { label: string; cls: string }> = {
  passed: { label: "برگزار شد", cls: "text-ink3 border-line bg-transparent" },
  current: { label: "در حال برگزاری", cls: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
  upcoming: { label: "در انتظار", cls: "text-aurora-400 border-aurora-500/30 bg-aurora-500/10" },
};

const CHIPS = [
  "from-aurora-500 to-aurora-700",
  "from-violet-500 to-purple-700",
  "from-emerald-500 to-teal-700",
  "from-amber-500 to-orange-600",
  "from-sky-500 to-blue-700",
];

const LESSON_ICON =
  "M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5";

/* ---- school-day window: 07:00 → 14:00 ---- */
const DAY_START = 7 * 60;
const DAY_END = 14 * 60;
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/** "۷:۳۰" | "07:30" → minutes since midnight (null if unparsable) */
function parseMinutes(text: string): number | null {
  if (!text) return null;
  const norm = text.replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)));
  const m = norm.match(/(\d{1,2})\s*[:.]\s*(\d{1,2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function fmtClock(date: Date): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return toFa(`${hh}:${mm}`);
}

export default function TodaySchedule() {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    getTodaySchedule()
      .then(setSchedule)
      .catch(() => setSchedule([]))
      .finally(() => setLoading(false));
  }, []);

  // live clock — re-render every 30s so statuses & progress track real time
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const progress = Math.min(1, Math.max(0, (nowMin - DAY_START) / (DAY_END - DAY_START)));
  const dayState: "before" | "during" | "after" =
    nowMin < DAY_START ? "before" : nowMin >= DAY_END ? "after" : "during";

  // only lessons inside the 07:00–14:00 window, ordered by time, with live status
  const items = useMemo(() => {
    const timed = schedule
      .map((item) => ({ ...item, start: parseMinutes(item.time) }))
      .filter((x) => x.start === null || (x.start >= DAY_START && x.start <= DAY_END));
    timed.sort((a, b) => (a.start ?? 9999) - (b.start ?? 9999));

    let currentIdx = -1;
    timed.forEach((x, i) => {
      if (x.start !== null && x.start <= nowMin) currentIdx = i;
    });

    return timed.map((x, i) => {
      let status: ScheduleItem["status"] = x.status;
      if (x.start !== null) {
        if (nowMin < DAY_START || x.start > nowMin) status = "upcoming";
        else if (nowMin >= DAY_END) status = "passed";
        else status = i === currentIdx ? "current" : i < currentIdx ? "passed" : "upcoming";
      }
      return { ...x, status };
    });
  }, [schedule, nowMin]);

  return (
    <section className="glass anim-fade-up rounded-3xl p-6 transition-[border-color,box-shadow] duration-300 hover:border-aurora-500/25 hover:shadow-[0_12px_36px_-22px_color-mix(in_srgb,var(--color-aurora-500)_40%,transparent)]" style={{ animationDelay: "240ms" }}>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-extrabold text-ink">برنامه امروز</h2>
          <p className="mt-0.5 text-[12px] text-ink3">
            {loading ? "در حال بارگذاری..." : `امروز · ${toFa(items.length)} درس · بازه ۷:۰۰ تا ۱۴:۰۰`}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-2 rounded-full border border-aurora-500/30 bg-aurora-500/10 px-3 py-1 text-[11.5px] font-extrabold text-aurora-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-aurora-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-aurora-500" />
          </span>
          {fmtClock(now)}
        </span>
      </div>

      {/* school-day timeline 07:00 → 14:00 */}
      <div className="mb-5">
        <div className="relative h-2 rounded-full bg-line">
          <div
            className="absolute inset-y-0 right-0 rounded-full bg-gradient-to-l from-aurora-400 to-aurora-600 transition-[width] duration-1000"
            style={{ width: `${progress * 100}%` }}
          />
          {dayState === "during" && (
            <span
              className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 translate-x-1/2"
              style={{ right: `${progress * 100}%` }}
            >
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-aurora-400 opacity-60" />
              <span className="relative block h-3.5 w-3.5 rounded-full border-2 border-white bg-aurora-500 shadow" />
            </span>
          )}
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10.5px] font-bold text-ink3">
          <span>۷:۰۰ صبح</span>
          <span className="text-aurora-400">
            {dayState === "during" ? `اکنون · ${fmtClock(now)}` : dayState === "before" ? "برنامه هنوز شروع نشده" : "برنامه امروز پایان یافت"}
          </span>
          <span>۲ بعدازظهر</span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-2xl border border-line p-3.5">
              <div className="skel h-11 w-11 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="skel h-3 w-40" />
                <div className="skel h-3 w-64" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ul className="relative space-y-3">
          {items.map((lesson, i) => {
            const meta = statusMeta[lesson.status] ?? statusMeta.upcoming;
            const isCurrent = lesson.status === "current";
            return (
              <li
                key={lesson.id}
                className={`anim-fade-up flex items-center gap-4 rounded-2xl border p-3.5 transition-colors duration-200 ${
                  isCurrent
                    ? "border-aurora-500/40 bg-aurora-500/8"
                    : "border-line hover:border-aurora-500/25 hover:bg-aurora-500/4"
                }`}
                style={{ animationDelay: `${280 + i * 80}ms` }}
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${CHIPS[i % CHIPS.length]} text-white`}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={LESSON_ICON} />
                  </svg>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14px] font-bold text-ink">{lesson.lesson}</p>
                    {isCurrent && (
                      <span className="msg-in inline-flex items-center gap-1 rounded-full bg-aurora-500 px-2 py-0.5 text-[10px] font-black text-white shadow-sm shadow-aurora-500/40">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                        اکنون
                      </span>
                    )}
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${meta.cls}`}>
                      {meta.label}
                    </span>
                  </div>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink3">
                    <span className="rounded-md border border-line bg-card2/60 px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-ink2">
                      {toFa(lesson.time)}
                    </span>
                    <span>{lesson.room}</span>
                    <span className="text-ink3/50">·</span>
                    <span>{lesson.teacher}</span>
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && items.length === 0 && (
        <div className="anim-fade-up rounded-2xl border border-dashed border-line p-8 text-center">
          <p className="text-[13px] font-bold text-ink2">برنامهای برای بازه امروز ثبت نشده</p>
          <p className="mt-1 text-[11px] text-ink3">درسهای بازه ۷:۰۰ تا ۱۴:۰۰ اینجا نمایش داده میشوند</p>
        </div>
      )}
    </section>
  );
}
