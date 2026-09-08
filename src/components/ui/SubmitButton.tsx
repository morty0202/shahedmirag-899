import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "success" | "secondary" | "ghost" | "danger";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: Variant;
  children: ReactNode;
}

/** Primary action button — design-system variant + inline spinner. */
export default function SubmitButton({ loading, variant = "primary", children, disabled, className = "", ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`btn btn-${variant} w-full ${className}`}
    >
      {loading && (
        <svg className="h-4.5 w-4.5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
          <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {children}
    </button>
  );
}
