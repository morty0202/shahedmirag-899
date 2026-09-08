import { useCallback, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { quickAccess } from "../../data/dashboard";

/** Tracks the cursor as 0..1 CSS vars — powers the sheen + parallax (no re-renders). */
function useCardPointer() {
  return useCallback((e: MouseEvent<HTMLAnchorElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", ((e.clientX - rect.left) / rect.width).toFixed(3));
    el.style.setProperty("--my", ((e.clientY - rect.top) / rect.height).toFixed(3));
  }, []);
}

export default function QuickAccess() {
  const onPointerMove = useCardPointer();

  return (
    <section className="anim-fade-up" style={{ animationDelay: "100ms" }}>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-[16px] font-extrabold text-ink">دسترسی سریع</h2>
          <p className="mt-0.5 text-[12px] text-ink3">مهم‌ترین بخش‌های سامانه در یک نگاه</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {quickAccess.map((item, i) => (
          <Link
            key={item.to}
            to={item.to}
            onMouseMove={onPointerMove}
            onMouseLeave={(e) => {
              e.currentTarget.style.setProperty("--mx", "0.5");
              e.currentTarget.style.setProperty("--my", "0.5");
            }}
            className={`qa-card glass anim-fade-up group rounded-2xl border-line p-4 ${
              "special" in item && item.special ? "qa-ai" : ""
            }`}
            style={{ animationDelay: `${120 + i * 45}ms` }}
          >
            <div className="qa-parallax">
              {/* icon + circular action indicator */}
              <div className="flex items-start justify-between">
                <span
                  className={`qa-icon ${item.motion} flex h-10 w-10 items-center justify-center rounded-xl border ${item.tint}`}
                >
                  <svg className="h-[19px] w-[19px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.d} />
                  </svg>
                </span>
                <span className="qa-arrowbox">
                  <svg className="h-3.5 w-3.5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              </div>

              <h3 className="qa-title mt-3.5 text-[13.5px] font-extrabold text-ink transition-colors group-hover:text-aurora-500">
                {item.title}
              </h3>
              <p className="qa-desc mt-0.5 text-[11px] leading-5 text-ink3 group-hover:text-ink2">
                {item.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
