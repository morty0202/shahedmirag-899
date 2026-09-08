import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import DeviceTest from "../../components/classroom/DeviceTest";
import Alert from "../../components/ui/Alert";
import { useAuth } from "../../auth/AuthContext";
import { listSessions, type ClassSession } from "../../lib/api/restClassrooms";
import { signalingMode } from "../../lib/realtime/signaling";
import { toFa } from "../../utils/fa";
import { roleLabels } from "../../lib/api";

const JALALI_MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];

function fmtSessionDate(s: ClassSession): string {
  return `${toFa(s.date.jd)} ${JALALI_MONTHS[s.date.jm - 1]} ${toFa(s.date.jy)} · ساعت ${toFa(s.time)}`;
}

export default function ClassroomLobby() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);
  const kicked = (location.state as { kicked?: string } | null)?.kicked;

  useEffect(() => {
    listSessions().then((s) => {
      setSessions(s);
      setLoading(false);
    });
  }, []);

  const isTeacher = user?.role === "teacher" || user?.role === "admin";

  return (
    <div className="space-y-6">
      {/* kicked notice */}
      {kicked && <Alert variant="error">{kicked}</Alert>}

      {/* header */}
      <section className="glass anim-fade-up relative overflow-hidden rounded-3xl p-6 md:p-8">
        <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-[80px]" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-black text-ink">کلاس‌های آنلاین</h1>
            <p className="mt-1 text-[13px] leading-7 text-ink3">
              به کلاس‌های زنده بپیوندید، جزوات درسی را دنبال کنید و با معلم خود تعامل داشته باشید.
            </p>
          </div>
          {isTeacher && (
            <Link
              to="/classes/teach"
              className="btn btn-primary gap-2"
            >
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              پنل معلم — برنامه‌ریزی کلاس
            </Link>
          )}
        </div>

        {/* transport status — honest about which signaling layer is active */}
        <div className={`relative mt-5 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-bold ${
          signalingMode().transport === "remote"
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
            : "border-amber-500/30 bg-amber-500/10 text-amber-500"
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${signalingMode().transport === "remote" ? "bg-emerald-500" : "bg-amber-500"}`} />
          {signalingMode().transport === "remote"
            ? `${signalingMode().label} — کاربران از دستگاه‌های مختلف قابل اتصال هستند`
            : `${signalingMode().label} — فقط تب‌های همین مرورگر؛ برای کلاس واقعی سرور سیگنالینگ را اجرا کنید`}
        </div>
      </section>

      {/* device test */}
      <DeviceTest />

      {/* sessions */}
      <section className="anim-fade-up" style={{ animationDelay: "100ms" }}>
        <h2 className="mb-4 text-[16px] font-extrabold text-ink">کلاس‌های پیش‌رو</h2>

        {loading ? (
          <div className="glass rounded-3xl p-8 text-center text-[12.5px] text-ink3">در حال بارگذاری برنامه کلاس‌ها...</div>
        ) : sessions.length === 0 ? (
          <div className="glass rounded-3xl p-10 text-center">
            <p className="text-[13px] text-ink3">
              {isTeacher ? "هنوز کلاسی برنامه‌ریزی نکرده‌اید؛ از پنل معلم اولین کلاس را بسازید." : "در حال حاضر کلاس آنلاینی برنامه‌ریزی نشده است."}
            </p>
          </div>
        ) : (
          <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
            {sessions.map((s, i) => (
              <article
                key={s.id}
                className="card-hover glass anim-fade-up flex flex-col rounded-2xl p-5"
                style={{ animationDelay: `${140 + i * 60}ms` }}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-[14.5px] font-extrabold text-ink">{s.title}</h3>
                    <p className="mt-0.5 text-[11.5px] text-ink3">
                      {s.subject} · پایه {toFa(s.grade)} · {s.teacherName}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-aurora-500/30 bg-aurora-500/10 px-2.5 py-1 text-[10px] font-bold text-aurora-500">
                    کد {toFa(s.roomCode)}
                  </span>
                </div>

                <div className="mb-4 flex flex-wrap gap-2 text-[11px] text-ink2">
                  <span className="rounded-lg border border-line bg-aurora-500/5 px-2.5 py-1">📅 {fmtSessionDate(s)}</span>
                  <span className="rounded-lg border border-line bg-aurora-500/5 px-2.5 py-1">⏱ {toFa(s.durationMin)} دقیقه</span>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(`/classes/room/${s.roomCode}`)}
                  className="btn btn-success mt-auto w-full gap-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  {isTeacher ? "شروع و ورود به جلسه" : "ورود به کلاس"}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* how it works */}
      <section className="glass anim-fade-up rounded-3xl p-6" style={{ animationDelay: "180ms" }}>
        <h2 className="mb-4 text-[14px] font-extrabold text-ink">چطور کار می‌کند؟</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { t: "۱. اتصال مستقیم P2P", d: "صدا و تصویر شما با فناوری WebRTC مستقیماً بین شرکت‌کنندگان رد و بدل می‌شود." },
            { t: "۲. کیفیت تطبیقی", d: "کیفیت تصویر بر اساس سرعت اینترنت شما به‌صورت خودکار تنظیم می‌شود." },
            { t: "۳. اتصال مجدد خودکار", d: "اگر اینترنت قطع و وصل شود، جلسه بدون از دست رفتن کلاس بازسازی می‌شود." },
          ].map((x) => (
            <div key={x.t} className="rounded-2xl border border-line bg-aurora-500/5 p-4">
              <p className="text-[12.5px] font-extrabold text-aurora-500">{x.t}</p>
              <p className="mt-1.5 text-[11.5px] leading-6 text-ink3">{x.d}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[10.5px] leading-5 text-ink3">
          نقش شما: {user ? roleLabels[user.role] : "—"} — {isTeacher ? "می‌توانید کلاس بسازید و شرکت‌کنندگان را مدیریت کنید." : "برای ساختن کلاس با معلم خود هماهنگ کنید."}
        </p>
      </section>
    </div>
  );
}
