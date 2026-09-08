import AnimatedNumber from "../ui/AnimatedNumber";
import { useAuth } from "../../auth/AuthContext";
import { roleLabels } from "../../lib/api";
import { toFa } from "../../utils/fa";

export default function StudentProfileCard() {
  const { user } = useAuth();
  if (!user) return null;

  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.trim() || "؟";
  const rows = [
    {
      label: "شماره دانش‌آموزی",
      value: toFa(user.studentNumber),
      d: "M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z",
    },
    {
      label: "کلاس",
      value: user.role === "student" ? user.className : user.className,
      d: "M4.5 13.5L12 7.5l7.5 6M4.5 20.25h15a1.5 1.5 0 001.5-1.5v-9a1.5 1.5 0 00-1.5-1.5h-15A1.5 1.5 0 003 9.75v9a1.5 1.5 0 001.5 1.5z",
    },
    {
      label: "سال تحصیلی",
      value: user.academicYear,
      d: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5",
    },
    {
      label: "وضعیت تحصیلی",
      value: "فعال — بدون غیبت غیرموجه",
      d: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    },
  ];

  return (
    <section className="glass anim-fade-up rounded-3xl p-6 transition-[border-color,box-shadow] duration-300 hover:border-aurora-500/25 hover:shadow-[0_12px_36px_-22px_rgba(79,70,229,0.4)]" style={{ animationDelay: "420ms" }}>
      {/* header */}
      <div className="flex items-center gap-4">
        {user.avatar ? (
          <img src={user.avatar} alt="" className="h-14 w-14 rounded-2xl object-cover ring-1 ring-line" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-aurora-400 via-aurora-600 to-purple-700 text-lg font-black text-white ring-1 ring-line">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-extrabold text-ink">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-[12px] text-ink3">
            {user.role === "student"
              ? `دانش‌آموز پایه ${user.grade} · رشته ${user.field}`
              : `${roleLabels[user.role]} · ${user.className}`}
          </p>
        </div>
      </div>

      {/* info rows */}
      <dl className="mt-5 space-y-1">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-aurora-500/5"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-aurora-500/8 text-aurora-500">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                <path strokeLinecap="round" strokeLinejoin="round" d={row.d} />
              </svg>
            </span>
            <dt className="text-[12px] text-ink3">{row.label}</dt>
            <dd className="mr-auto text-[12.5px] font-bold text-ink">{row.value}</dd>
          </div>
        ))}
      </dl>

      {/* academic summary — student-only (معدل و حضور برای مدیر/معلم نمایش داده نمیشود) */}
      {user.role === "student" && (
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-5">
          <div className="rounded-xl border border-line bg-aurora-500/5 px-4 py-3 text-center">
            <p className="text-[16px] font-extrabold text-aurora-500">
              <AnimatedNumber value={19.25} decimals={2} format="gpa" duration={1300} />
            </p>
            <p className="mt-0.5 text-[11px] text-ink3">معدل ترم جاری</p>
          </div>
          <div className="rounded-xl border border-line bg-aurora-500/5 px-4 py-3 text-center">
            <p className="text-[16px] font-extrabold text-emerald-500">
              <AnimatedNumber value={98} format="percent" duration={1300} />
            </p>
            <p className="mt-0.5 text-[11px] text-ink3">درصد حضور</p>
          </div>
        </div>
      )}
    </section>
  );
}
