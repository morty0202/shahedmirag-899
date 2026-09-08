export default function MotivationalCard() {
  return (
    <section
      className="anim-fade-up relative overflow-hidden rounded-3xl border border-aurora-500/15 bg-gradient-to-bl from-aurora-900 via-[#1c1852] to-aurora-950 p-6 text-white shadow-[0_14px_44px_-28px_rgba(79,70,229,0.55)]"
      style={{ animationDelay: "500ms" }}
    >
      {/* calm night ambiance */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-14 right-8 h-40 w-40 rounded-full bg-purple-500/20 blur-[80px]" />
        <div className="absolute bottom-0 left-0 h-36 w-36 rounded-full bg-cyan-400/10 blur-[70px]" />
        <svg className="absolute left-6 top-5 h-7 w-7 text-amber-300/70" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21 14.5A9 9 0 019.5 3 9 9 0 1021 14.5z" />
        </svg>
      </div>

      <div className="relative">
        <span className="text-[11px] font-bold tracking-wide text-aurora-200/70">سخن روز</span>

        <p className="mt-4 text-[15.5px] font-bold leading-[2.05] text-aurora-50">
          «آموختن، تنها گنجی است
          <br />
          که هرچه خرج شود، بیشتر می‌شود.»
        </p>

        <p className="mt-3 text-[11px] text-aurora-200/55">— دفتر مشاوره مدرسه شاهد معراج</p>
      </div>
    </section>
  );
}
