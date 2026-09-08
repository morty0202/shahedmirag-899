interface Props {
  variant: "success" | "error" | "info";
  children: React.ReactNode;
  className?: string;
}

const styles = {
  success: {
    box: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
    icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  error: {
    box: "border-error/30 bg-error/10 text-error",
    icon: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.008v.008H12v-.008z",
  },
  info: {
    box: "border-aurora-500/30 bg-aurora-500/10 text-aurora-500",
    icon: "M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.852l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z",
  },
} as const;

export default function Alert({ variant, children, className = "" }: Props) {
  const s = styles[variant];
  return (
    <div
      role="alert"
      className={`pop-in flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[12.5px] font-semibold leading-6 ${s.box} ${className}`}
    >
      <svg className="mt-0.5 h-4.5 w-4.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
      </svg>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
