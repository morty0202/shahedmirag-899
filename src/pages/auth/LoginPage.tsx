import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthShell from "../../components/auth/AuthShell";
import Field from "../../components/ui/Field";
import PasswordField from "../../components/ui/PasswordField";
import SubmitButton from "../../components/ui/SubmitButton";
import Alert from "../../components/ui/Alert";
import { useAuth } from "../../auth/AuthContext";
import { errorMessages } from "../../lib/api";

const demoAccounts = [
  { label: "دانش‌آموز", username: "amir", password: "Amir1404@" },
  { label: "معلم", username: "ahmadi", password: "Teacher1404@" },
  { label: "مدیر", username: "admin", password: "Admin1404@" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const errors: typeof fieldErrors = {};
    if (!username.trim()) errors.username = "نام کاربری را وارد کنید";
    if (!password) errors.password = "رمز عبور را وارد کنید";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    const result = await login(username, password, remember);
    setLoading(false);

    if (result.ok) {
      navigate(from, { replace: true });
    } else {
      setError(errorMessages[result.error ?? "server_error"]);
    }
  };

  return (
    <AuthShell
      title="ورود به سامانه"
      subtitle="برای دسترسی به داشبورد، جزوات و کلاس‌ها وارد حساب خود شوید."
      footer={
        <>
          حساب کاربری ندارید؟{" "}
          <Link to="/register" className="font-bold text-aurora-500 transition-colors hover:text-aurora-400">
            ثبت‌نام دانش‌آموز
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && <Alert variant="error">{error}</Alert>}

        <div className="anim-fade-up" style={{ animationDelay: "40ms" }}>
        <Field label="نام کاربری" required error={fieldErrors.username}>
          <div className="group relative">
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink3 transition-colors duration-200 group-focus-within:text-aurora-500">
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="مثلاً amir"
              autoComplete="username"
              dir="ltr"
              className={`h-11 w-full rounded-xl border bg-card2/60 pr-10 pl-4 text-left text-[13.5px] text-ink outline-none transition-all placeholder:text-ink3 hover:border-aurora-500/30 ${
                fieldErrors.username
                  ? "border-error/60"
                  : "border-line focus:border-aurora-500/50 focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-aurora-500)_12%,transparent)]"
              }`}
            />
          </div>
        </Field>
        </div>

        <div className="anim-fade-up" style={{ animationDelay: "100ms" }}>
        <Field label="رمز عبور" required error={fieldErrors.password}>
          <div className="group">
            <PasswordField
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              placeholder="••••••••"
              hasError={!!fieldErrors.password}
              prefix={
                <svg className="h-[18px] w-[18px] transition-colors duration-200 group-focus-within:text-aurora-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              }
            />
            <div className="mt-2 flex items-center justify-between">
              <label className="flex cursor-pointer select-none items-center gap-2 text-[12px] font-semibold text-ink2">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded accent-aurora-500"
                />
                مرا به خاطر بسپار
              </label>
              <Link
                to="/forgot-password"
                className="text-[12px] font-bold text-aurora-500 transition-colors hover:text-aurora-400"
              >
                رمز عبور را فراموش کرده‌اید؟
              </Link>
            </div>
          </div>
        </Field>
        </div>

        <div className="anim-fade-up" style={{ animationDelay: "160ms" }}>
          <SubmitButton type="submit" loading={loading} className="ft-sheen">
            {loading ? "در حال ورود..." : "ورود به سامانه"}
          </SubmitButton>
        </div>
      </form>

      {/* demo quick-fill */}
      <div className="mt-6 rounded-2xl border border-dashed border-aurora-500/40 bg-gradient-to-br from-aurora-500/8 to-fuchsia-500/6 p-4">
        <p className="mb-2.5 text-[11.5px] font-bold text-ink2">حساب‌های نمایشی — با یک کلیک وارد شوید:</p>
        <div className="flex flex-wrap gap-2">
          {demoAccounts.map((acc, i) => (
            <button
              key={acc.username}
              type="button"
              onClick={() => {
                setUsername(acc.username);
                setPassword(acc.password);
                setError(null);
                setFieldErrors({});
              }}
              style={{ animationDelay: `${200 + i * 80}ms` }}
              className="press pop-in rounded-full border border-aurora-500/25 bg-aurora-500/10 px-3 py-1.5 text-[11.5px] font-bold text-aurora-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-aurora-500/50 hover:bg-aurora-500/20 hover:shadow-md hover:shadow-aurora-500/20 dark:text-aurora-300"
            >
              {acc.label} · {acc.username}
            </button>
          ))}
        </div>
      </div>
    </AuthShell>
  );
}
