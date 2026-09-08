import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../../components/auth/AuthShell";
import Field from "../../components/ui/Field";
import PasswordField from "../../components/ui/PasswordField";
import PasswordMeter from "../../components/ui/PasswordMeter";
import SubmitButton from "../../components/ui/SubmitButton";
import Alert from "../../components/ui/Alert";
import { api, errorMessages } from "../../lib/api";
import { validatePassword, validatePasswordMatch } from "../../lib/validation";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"identify" | "reset">("identify");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const requestCode = async () => {
    if (!identifier.trim()) {
      setError("نام کاربری، کد ملی یا شماره موبایل خود را وارد کنید");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await api.requestReset(identifier);
    setLoading(false);
    if (result.ok) {
      setDemoCode(result.data.demoCode);
      setPhase("reset");
    } else {
      setError(errorMessages[result.error]);
    }
  };

  const complete = async () => {
    const pwError = validatePassword(password);
    const matchError = validatePasswordMatch(password, passwordRepeat);
    if (!code.trim()) {
      setError("کد بازیابی را وارد کنید");
      return;
    }
    if (pwError || matchError) {
      setError(pwError ?? matchError);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await api.completeReset(identifier, code, password);
    setLoading(false);
    if (result.ok) {
      setDone(true);
    } else {
      setError(errorMessages[result.error]);
    }
  };

  return (
    <AuthShell
      title={done ? "رمز عبور تغییر کرد" : "بازیابی رمز عبور"}
      subtitle={
        done
          ? "رمز عبور شما با موفقیت بازنشانی شد؛ اکنون می‌توانید وارد شوید."
          : phase === "identify"
          ? "نام کاربری، کد ملی یا شماره موبایل حساب خود را وارد کنید تا کد بازیابی برای شما ارسال شود."
          : "کد ۶ رقمی ارسال‌شده و رمز عبور جدید را وارد کنید."
      }
      footer={
        <Link to="/login" className="font-bold text-aurora-500 transition-colors hover:text-aurora-400">
          بازگشت به صفحه ورود
        </Link>
      }
    >
      {done ? (
        <div className="space-y-5">
          <Alert variant="success">رمز عبور جدید برای حساب شما ثبت شد. برای ورود از رمز جدید استفاده کنید.</Alert>
          <SubmitButton type="button" onClick={() => navigate("/login")}>
            رفتن به صفحه ورود
          </SubmitButton>
        </div>
      ) : (
        <div className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}

          {phase === "identify" ? (
            <>
              <Field label="نام کاربری / کد ملی / موبایل" required>
                <input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="مثلاً amir یا 09121234567"
                  dir="ltr"
                  className="h-11 w-full rounded-xl border border-line bg-card2/60 px-4 text-left text-[13.5px] text-ink outline-none transition-all placeholder:text-ink3 focus:border-aurora-500/50 focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-aurora-500)_12%,transparent)]"
                />
              </Field>
              <SubmitButton type="button" onClick={requestCode} loading={loading}>
                {loading ? "در حال بررسی..." : "دریافت کد بازیابی"}
              </SubmitButton>
            </>
          ) : (
            <>
              {demoCode && (
                <Alert variant="info">
                  نسخه نمایشی: کد بازیابی شما <span className="font-black" dir="ltr">{demoCode}</span> است.
                  <br />
                  (در نسخه اصلی این کد پیامک می‌شود)
                </Alert>
              )}

              <Field label="کد بازیابی" required>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="------"
                  dir="ltr"
                  inputMode="numeric"
                  maxLength={6}
                  className="h-11 w-full rounded-xl border border-line bg-card2/60 px-4 text-center text-[15px] font-bold tracking-[0.5em] text-ink outline-none transition-all placeholder:text-ink3 focus:border-aurora-500/50"
                />
              </Field>

              <Field label="رمز عبور جدید" required>
                <PasswordField value={password} onChange={setPassword} autoComplete="new-password" placeholder="رمز جدید" />
                <PasswordMeter password={password} />
              </Field>

              <Field label="تکرار رمز عبور جدید" required>
                <PasswordField value={passwordRepeat} onChange={setPasswordRepeat} autoComplete="new-password" placeholder="تکرار رمز جدید" />
              </Field>

              <SubmitButton type="button" onClick={complete} loading={loading}>
                {loading ? "در حال ثبت..." : "تغییر رمز عبور"}
              </SubmitButton>
            </>
          )}
        </div>
      )}
    </AuthShell>
  );
}
