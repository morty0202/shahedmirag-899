import { toFa } from "../../utils/fa";

interface StepperProps {
  steps: string[];
  current: number;
}

/** Horizontal RTL progress indicator with checkmarks for done steps. */
export default function Stepper({ steps, current }: StepperProps) {
  return (
    <ol className="flex items-center">
      {steps.map((title, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={title} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-extrabold transition-all duration-300 ${
                  done
                    ? "bg-emerald-500/15 text-emerald-500 ring-1 ring-emerald-500/40"
                    : active
                    ? "bg-gradient-to-br from-aurora-500 to-aurora-700 text-white shadow-[0_6px_16px_-6px_color-mix(in_srgb,var(--color-aurora-500)_60%,transparent)]"
                    : "border border-line bg-card2/60 text-ink3"
                }`}
              >
                {done ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.6}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  toFa(i + 1)
                )}
              </span>
              <span
                className={`whitespace-nowrap text-[10.5px] font-bold transition-colors ${
                  active ? "text-aurora-500" : done ? "text-emerald-500" : "text-ink3"
                } ${active ? "" : "hidden sm:block"}`}
              >
                {title}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span className="relative mx-2 mb-0 h-px flex-1 overflow-hidden rounded bg-line sm:mb-5">
                <span
                  className="absolute inset-y-0 right-0 bg-emerald-500/60 transition-all duration-500"
                  style={{ width: done ? "100%" : "0%" }}
                />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
