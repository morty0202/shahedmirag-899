import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";

interface Props {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

const FEATURES = [
  "احراز هویت امن با رمزنگاری‌شده",
  "پنل اختصاصی بر اساس نقش کاربری",
  "دسترسی به جزوات و برنامه درسی",
  "کلاس آنلاین بدون واسطه",
];

const PETALS: { left: string; top: string; size: number; dur: string; delay: string; dx: string; dy: string; rot: string; pink?: boolean }[] = [
  { left: "5%", top: "22%", size: 16, dur: "12s", delay: "0.3s", dx: "12vw", dy: "60vh", rot: "130deg" },
  { left: "86%", top: "30%", size: 12, dur: "14s", delay: "1.6s", dx: "-10vw", dy: "54vh", rot: "200deg", pink: true },
  { left: "26%", top: "68%", size: 11, dur: "11s", delay: "0.9s", dx: "8vw", dy: "38vh", rot: "90deg", pink: true },
  { left: "72%", top: "74%", size: 13, dur: "13s", delay: "2.4s", dx: "-8vw", dy: "42vh", rot: "165deg" },
];

const SPARKS: { left: string; top: string; size: number; dur: string; delay: string }[] = [
  { left: "12%", top: "36%", size: 6, dur: "7s", delay: "0.4s" },
  { left: "84%", top: "56%", size: 5, dur: "8s", delay: "2.1s" },
  { left: "48%", top: "16%", size: 4, dur: "9s", delay: "1.2s" },
  { left: "64%", top: "84%", size: 5, dur: "7.5s", delay: "0.1s" },
  { left: "30%", top: "12%", size: 4, dur: "10s", delay: "2.6s" },
];

/** Scoped page animation: cinematic Ken Burns + floating petals + glow motes. */
const authCss = `
.auth-kenburns{animation:authKen 45s ease-in-out infinite alternate;will-change:transform;}
@keyframes authKen{from{transform:scale(1.03) translate(0,0);}to{transform:scale(1.16) translate(-1.5%,-1.2%);}}
.auth-petal{position:absolute;border-radius:50% 0 50% 0;background:linear-gradient(135deg,rgba(255,205,215,0.95),rgba(244,114,152,0.85));box-shadow:0 0 12px rgba(255,170,190,0.4);animation:authPetalDrift var(--dur) ease-in-out var(--delay) infinite;pointer-events:none;}
@keyframes authPetalDrift{0%{transform:translate(0,0) rotate(0deg);opacity:0;}12%{opacity:0.9;}90%{opacity:0.4;}100%{transform:translate(var(--dx),var(--dy)) rotate(var(--rot));opacity:0;}}
.auth-spark{position:absolute;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,0.95),rgba(255,220,180,0.45) 40%,transparent 70%);animation:authSpark var(--dur) ease-in-out var(--delay) infinite;pointer-events:none;}
@keyframes authSpark{0%,100%{opacity:0;transform:scale(0.4);}50%{opacity:1;transform:scale(1.25);}}
.auth-cardglow{box-shadow:0 40px 130px -32px rgba(8,4,28,0.7);}
.auth-topline{background:linear-gradient(90deg,transparent,color-mix(in_srgb,var(--color-aurora-500)_90%,transparent),rgba(103,232,249,0.9),rgba(240,171,252,0.9),transparent);background-size:200% auto;animation:ft-hue 6s linear infinite;}
.auth-halo{background:conic-gradient(from 0deg,rgba(253,230,138,0.8),rgba(251,191,36,0.4),rgba(255,251,235,0.85),rgba(252,211,77,0.45),rgba(253,230,138,0.8));animation:ft-spin 9s linear infinite;}
`;

const VIGNETTE =
  "radial-gradient(130% 100% at 50% 38%, transparent 50%, rgba(6,3,18,0.66) 100%)";

/** Premium auth layout: cinematic tulip-field backdrop + split hero/glass card. */
export default function AuthShell({ title, subtitle, children, footer }: Props) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-aurora-950 text-ink">
      <style>{authCss}</style>

      {/* ===== Cinematic tulip-field backdrop ===== */}
      <img
        src="/login-bg.png"
        alt=""
        aria-hidden="true"
        className="auth-kenburns absolute inset-0 h-full w-full select-none object-cover"
      />

      {/* layered brand-tinted overlays */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-[#0b0820]/70 via-[#170c30]/30 to-[#070417]/85 dark:from-[#05050f]/75 dark:via-[#12102b]/32 dark:to-[#04040c]/88"
      />
      <div aria-hidden="true" className="absolute inset-0" style={{ background: VIGNETTE }} />

      {/* decorative glow blobs */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-28 -right-28 h-[28rem] w-[28rem] rounded-full bg-aurora-500/25 blur-[140px]" />
        <div className="absolute top-1/3 -left-24 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-[130px]" />
        <div className="absolute -bottom-20 right-1/4 h-80 w-80 rounded-full bg-rose-400/15 blur-[120px]" />
      </div>

      {/* floating tulip petals + sparks */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {PETALS.map((p, i) => (
          <span
            key={i}
            className="auth-petal"
            style={
              {
                left: p.left,
                top: p.top,
                width: p.size,
                height: p.size,
                ...(p.pink
                  ? { background: "linear-gradient(135deg,rgba(255,175,200,0.95),rgba(219,112,147,0.85))" }
                  : {}),
                "--dur": p.dur,
                "--delay": p.delay,
                "--dx": p.dx,
                "--dy": p.dy,
                "--rot": p.rot,
              } as CSSProperties
            }
          />
        ))}
        {SPARKS.map((s, i) => (
          <span
            key={i}
            className="auth-spark"
            style={
              {
                left: s.left,
                top: s.top,
                width: s.size,
                height: s.size,
                "--dur": s.dur,
                "--delay": s.delay,
              } as CSSProperties
            }
          />
        ))}
      </div>
{/* ===== Split layout: hero (right in RTL) + glass card (left) ===== */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-5 py-12 md:px-10 lg:justify-start lg:px-[6vw]">
        <div className="grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.15fr_minmax(360px,430px)]">
          {/* ---- Hero / brand panel (desktop) ---- */}
          <section className="hidden select-none lg:block">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[12px] font-bold text-white/90 shadow-sm backdrop-blur-md">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-300" />
              </span>
              سامانه یکپارچه آموزشی · سال ۱۴۰۴
            </span>

            <h1 className="mt-7 text-5xl font-black leading-[1.3] text-white drop-shadow-2xl">
              مدرسه شاهد معراج
              <span className="mt-4 block bg-gradient-to-l from-aurora-300 via-white to-rose-200 bg-clip-text text-[1.45rem] font-extrabold text-transparent">
                دبیرستان دوره دوم · سامانه آموزشی
              </span>
            </h1>

            <p className="mt-6 max-w-md text-[14.5px] leading-8 text-white/80">
              دسترسی امن دانش‌آموزان، معلمان و مدیریت مدرسه به جزواته، کلاس‌های آنلاین،,
              افتخارات، اردوها و برنامه‌های آموزشی در یک نگاه.
            </p>

            <ul className="mt-9 space-y-4">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-3 text-[13.5px] font-semibold text-white/90">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-aurora-400 to-fuchsia-500/75 text-white shadow-md shadow-aurora-500/30">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </section>

          {/* ---- Form column ---- */}
          <section className="w-full max-w-md justify-self-center lg:justify-self-end">
            <div className="anim-fade-up">
              {/* school branding — mobile only */}
              <Link
                to="/login"
                className="group mb-6 flex flex-col items-center gap-2 text-center outline-none lg:hidden"
              >
                <span className="relative">
                  <span className="absolute inset-0 rounded-2xl bg-aurora-400/40 blur-lg transition-opacity group-hover:opacity-80" />
                  <img
                    src="/icon.jpg"
                    alt=""
                    className="relative h-14 w-14 rounded-2xl object-cover shadow-lg ring-2 ring-white/70"
                  />
                </span>
                <span className="text-white drop-shadow-md">
                  <span className="block text-[16.5px] font-black leading-7">مدرسه شاهد معراج</span>
                  <span className="block text-[11.5px] font-bold text-aurora-100/90">
                    دبیرستان دوره دوم · سامانه آموزشی
                  </span>
                </span>
              </Link>

              {/* gradient-ring glass card + spinning aurora halo */}
              <div className="relative">
                <div aria-hidden className="auth-halo absolute -inset-1.5 rounded-[2rem] opacity-20 blur-2xl" />
                <div className="auth-cardglow relative overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-white/70 via-white/25 to-white/10 p-px">
                  <span aria-hidden className="auth-topline absolute inset-x-8 top-0 z-10 h-px" />
                  <div className="rounded-[calc(1.75rem-1px)] bg-white/85 px-6 py-7 backdrop-blur-2xl md:px-8 dark:bg-[#101026]/80">
                    <h1 className="ft-gradient-title text-center text-[21px] font-black">{title}</h1>
                    <p className="mt-1.5 text-center text-[13px] leading-6 text-ink3">{subtitle}</p>

                  <div className="mt-6">{children}</div>

                  {footer && (
                    <div className="mt-6 rounded-2xl border border-dashed border-aurora-500/40 bg-aurora-500/5 px-4 py-3 text-center text-[12.5px] text-ink2">
                      {footer}
                    </div>
                  )}
                  </div>
                </div>
              </div>

              {/* feature chips — below card on mobile / compact screens */}
              <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 lg:hidden">
                {FEATURES.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-1.5 rounded-full border border-white/40 bg-white/20 px-3 py-1.5 text-[11.5px] font-bold text-white shadow-sm backdrop-blur-md"
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-300/90 text-emerald-950">
                      <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </div>

      {/* bottom signature */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex items-center justify-center gap-2 text-[11px] font-medium text-white/45">
        <span>سامانه جامع آموزشی مدرسه شاهد معراج</span>
        <span className="h-1 w-1 rounded-full bg-white/40" />
        <span>نسخه ۱.۰</span>
      </div>
    </div>
  );
}