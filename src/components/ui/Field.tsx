import type { ReactNode } from "react";

interface FieldProps {
  label: string;
  error?: string | null;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

/** Labeled form row with Persian error text. */
export default function Field({ label, error, hint, required, children, className = "" }: FieldProps) {
  return (
    <div className={className}>
      <label className="mb-1.5 flex items-center gap-1 text-[12.5px] font-bold text-ink2">
        {label}
        {required && <span className="text-error">*</span>}
      </label>
      {children}
      {error ? (
        <p className="msg-in mt-1.5 flex items-center gap-1 text-[11.5px] font-medium text-error">
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[11px] text-ink3">{hint}</p>
      ) : null}
    </div>
  );
}
