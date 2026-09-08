import { passwordStrength } from "../../lib/validation";

/** Live 4-segment strength meter + Persian checklist. */
export default function PasswordMeter({ password }: { password: string }) {
  if (!password) return null;
  const s = passwordStrength(password);

  return (
    <div className="msg-in mt-2.5 rounded-xl border border-line bg-aurora-500/5 p-3">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1.5" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i < s.score ? s.color : "bg-line"
              }`}
            />
          ))}
        </div>
        <span className="text-[11px] font-bold text-ink2">قدرت: {s.label}</span>
      </div>
      <ul className="mt-2.5 grid grid-cols-1 gap-1 min-[420px]:grid-cols-2">
        {s.checks.map((c) => (
          <li
            key={c.key}
            className={`flex items-center gap-1.5 text-[10.5px] transition-colors ${
              c.passed ? "text-emerald-500" : "text-ink3"
            }`}
          >
            <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
              {c.passed ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 4.5h.008v.008H12v-.008z" />
              )}
            </svg>
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
