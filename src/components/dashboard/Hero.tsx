import { getJalaliDate } from "../../utils/jalali";
import { useAuth } from "../../auth/AuthContext";
import Illustration from "./Illustration";
import AnimatedNumber from "../ui/AnimatedNumber";

export default function Hero() {
  const { user } = useAuth();
  const firstName = user?.firstName ?? "کاربر";

  const isStudent = user?.role === "student";

  const stats: { label: string; value?: string; num?: number }[] = [
    { label: "پایه تحصیلی", value: user ? `${user.grade} · ${user.field}` : "—" },
    { label: "کلاس", value: user?.className ?? "—" },
    // معدل فقط برای دانشآموز معنا دارد — برای مدیر/معلم نمایش داده نمیشود
    ...(isStudent
      ? [
          { label: "معدل ترم", num: 19.25 },
          { label: "معدل کل", num: 19.1 },
        ]
      : []),
  ];

  return (
    <section className="anim-fade-up relative overflow-hidden rounded-3xl bg-[#0d1b2a] shadow-[0_18px_48px_-30px_rgba(0,0,0,0.5)]">
      {/* Full-width night photo background */}
      <div className="absolute inset-0" aria-hidden="true">
        <Illustration />
      </div>

      {/* Content overlay */}
      <div className="relative z-10 min-h-[340px] md:min-h-[400px] lg:min-h-[440px]">
        {/* Gradient scrim for text readability on night scene */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/60 via-black/35 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

        <div className="relative flex flex-col justify-center gap-6 p-6 md:p-8 lg:p-10 xl:p-12">
          {/* Text side */}
          <div className="max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold text-white/90 backdrop-blur-sm">
                <svg className="h-3.5 w-3.5 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                {getJalaliDate()}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/8 px-3 py-1 text-[11px] font-bold text-white/70 backdrop-blur-sm">
                <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                </svg>
                دبیرستان شاهد معراج
              </span>
            </div>

            <h1 className="mt-3 text-[22px] font-black leading-8 text-white md:text-[27px] md:leading-10" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
              سلام، {firstName} 👋
            </h1>
            <p className="mt-1.5 max-w-md text-[13.5px] leading-7 text-white/75" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.4)' }}>
              به سامانه آموزشی مدرسه شاهد معراج خوش آمدید. برنامه درسی امروز و جزوات جدید در ادامه همین صفحه در دسترس شماست.
            </p>
          </div>

          {/* Stats */}
          <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 max-w-2xl">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className="anim-fade-up rounded-xl border border-white/10 bg-white/8 px-3.5 py-2.5 backdrop-blur-md transition-colors duration-200 hover:border-white/20 hover:bg-white/12"
                style={{ animationDelay: `${100 + i * 60}ms` }}
              >
                <dt className="text-[10.5px] font-medium text-white/50">{s.label}</dt>
                <dd className="mt-0.5 text-[14px] font-extrabold tracking-tight text-white">
                  {s.num !== undefined ? (
                    <AnimatedNumber value={s.num} decimals={2} format="gpa" duration={1300} />
                  ) : (
                    s.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* bottom accent hairline */}
      <div className="absolute inset-x-0 bottom-0 z-20 h-px bg-gradient-to-l from-transparent via-amber-400/30 to-transparent" />
    </section>
  );
}
