import { useState, type ReactNode } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  hasError?: boolean;
  id?: string;
  prefix?: ReactNode;
}

/** Password input with animated show/hide toggle. */
export default function PasswordField({ value, onChange, placeholder, autoComplete, hasError, id, prefix }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      {prefix && (
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink3">
          {prefix}
        </span>
      )}
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        dir="ltr"
        className={`h-11 w-full rounded-xl border bg-card2/60 px-4 text-left text-[13.5px] text-ink outline-none transition-all placeholder:text-ink3 ${
          prefix ? "pr-10" : ""
        } ${
          hasError
            ? "border-error/60 focus:shadow-[0_0_0_4px_rgba(248,113,113,0.12)]"
            : "border-line focus:border-aurora-500/50 focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-aurora-500)_12%,transparent)]"
        }`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "پنهان کردن رمز" : "نمایش رمز"}
        className="press absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-ink3 transition-colors hover:bg-aurora-500/10 hover:text-aurora-500"
      >
        {visible ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )}
      </button>
    </div>
  );
}
