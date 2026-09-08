import { useEffect, useState } from "react";
import { toFa } from "../../utils/fa";

interface Props {
  value: number;
  /** decimal digits shown while counting and at rest */
  decimals?: number;
  /** "۱۹/۲۵" style used for GPA-like values */
  format?: "plain" | "gpa" | "percent";
  duration?: number;
  className?: string;
}

function formatValue(v: number, decimals: number, format: Props["format"]): string {
  if (format === "gpa") {
    const [int, dec] = v.toFixed(decimals).split(".");
    return `${toFa(int)}/${toFa(dec)}`;
  }
  const base = toFa(v.toFixed(decimals));
  return format === "percent" ? `${base}٪` : base;
}

/** Counts up to `value` with an ease-out curve; renders Persian digits. */
export default function AnimatedNumber({
  value,
  decimals = 0,
  format = "plain",
  duration = 1100,
  className,
}: Props) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCurrent(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setCurrent(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return (
    <span className={className} dir="rtl">
      {formatValue(current, decimals, format)}
    </span>
  );
}
