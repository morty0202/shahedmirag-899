interface PlaceholderProps {
  title: string;
  description: string;
  d: string;
}

export default function Placeholder({ title, description, d }: PlaceholderProps) {
  return (
    <div className="anim-fade-up">
      <section className="glass relative flex min-h-[62vh] flex-col items-center justify-center overflow-hidden rounded-[28px] p-10 text-center">
        {/* ambient */}
        <span className="pointer-events-none absolute -top-20 h-64 w-64 rounded-full bg-aurora-500/15 blur-[90px]" />
        <span className="pointer-events-none absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-purple-500/10 blur-[100px]" />

        <div className="relative mb-6">
          <div className="flex h-[72px] w-[72px] items-center justify-center rounded-3xl bg-gradient-to-br from-aurora-400 via-aurora-600 to-purple-700 text-white shadow-[0_12px_32px_-14px_rgba(79,70,229,0.6)]">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={d} />
            </svg>
          </div>
        </div>

        <h1 className="relative text-2xl font-black text-ink">{title}</h1>
        <p className="relative mt-2 max-w-sm text-[13.5px] leading-7 text-ink3">{description}</p>

        <span className="relative mt-6 inline-flex items-center gap-2 rounded-full border border-line bg-aurora-500/8 px-4 py-1.5 text-[11.5px] font-bold text-ink2">
          <span className="h-1.5 w-1.5 rounded-full bg-aurora-400" />
          به‌زودی در نسخه بعدی
        </span>
      </section>
    </div>
  );
}
