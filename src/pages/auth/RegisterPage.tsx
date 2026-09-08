import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../../components/auth/AuthShell";
import Field from "../../components/ui/Field";
import PasswordField from "../../components/ui/PasswordField";
import PasswordMeter from "../../components/ui/PasswordMeter";
import Stepper from "../../components/ui/Stepper";
import AvatarInput from "../../components/ui/AvatarInput";
import SubmitButton from "../../components/ui/SubmitButton";
import Alert from "../../components/ui/Alert";
import { useAuth } from "../../auth/AuthContext";
import { api, errorMessages, type RegisterInput } from "../../lib/api";
import { toFa } from "../../utils/fa";
import {
  validateEmail,
  validateNationalId,
  validatePassword,
  validatePasswordMatch,
  validatePersianName,
  validatePhone,
  validateStudentNumber,
  validateUsername,
} from "../../lib/validation";

const JALALI_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

const GRADES = ["دهم", "یازدهم", "دوازدهم"];
const FIELDS = ["ریاضی و فیزیک", "علوم تجربی", "علوم انسانی"];
const CLASS_NUMBERS_BY_GRADE: Record<string, string[]> = {
  "دهم": ["161", "162", "151", "171"],
  "یازدهم": ["261", "262", "251", "271"],
  "دوازدهم": ["361", "362", "351", "371"],
};

const inputCls = (hasError?: boolean) =>
  `h-11 w-full rounded-xl border bg-card2/60 px-4 text-[13.5px] text-ink outline-none transition-all placeholder:text-ink3 hover:border-aurora-500/30 ${
    hasError
      ? "border-error/60"
      : "border-line hover:border-aurora-500/30 focus:border-aurora-500/50 focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-aurora-500)_12%,transparent)]"
  }`;

const selectCls =
  "h-11 w-full appearance-none rounded-xl border border-line bg-card2/60 px-4 text-[13.5px] font-semibold text-ink outline-none transition-all hover:border-aurora-500/30 focus:border-aurora-500/50 focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-aurora-500)_12%,transparent)]";

type FormState = Omit<RegisterInput, "password"> & { password: string; passwordRepeat: string };

const initialForm: FormState = {
  firstName: "",
  lastName: "",
  fatherName: "",
  birthDate: { jy: 1388, jm: 1, jd: 1 },
  nationalId: "",
  phone: "",
  email: "",
  avatar: undefined,
  grade: "یازدهم",
  className: "261",
  field: "ریاضی و فیزیک",
  academicYear: "۱۴۰۴–۱۴۰۵",
  studentNumber: "",
  username: "",
  password: "",
  passwordRepeat: "",
};

type Errors = Partial<Record<keyof FormState, string | null>>;
type UsernameStatus = "idle" | "checking" | "available" | "taken";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Errors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  // debounced username availability check
  useEffect(() => {
    if (step !== 2 || validateUsername(form.username)) {
      setUsernameStatus("idle");
      return;
    }
    let cancelled = false;
    setUsernameStatus("checking");
    const t = window.setTimeout(async () => {
      const { available } = await api.checkUsername(form.username);
      if (!cancelled) setUsernameStatus(available ? "available" : "taken");
    }, 550);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [form.username, step]);

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = 1392; y >= 1368; y--) list.push(y);
    return list;
  }, []);

  /* ---------- per-step validation ---------- */

  function validateStep1(): boolean {
    const e: Errors = {};
    e.firstName = validatePersianName(form.firstName);
    e.lastName = validatePersianName(form.lastName);
    e.fatherName = validatePersianName(form.fatherName);
    e.nationalId = validateNationalId(form.nationalId);
    e.phone = validatePhone(form.phone);
    e.email = validateEmail(form.email ?? "");
    setErrors(e);
    return Object.values(e).every((v) => !v);
  }

  function validateStep2(): boolean {
    const e: Errors = {};
    e.studentNumber = validateStudentNumber(form.studentNumber);
    if (!form.grade) e.grade = "پایه تحصیلی را انتخاب کنید";
    if (!form.className) e.className = "کلاس را انتخاب کنید";
    if (!form.field) e.field = "رشته را انتخاب کنید";
    setErrors(e);
    return Object.values(e).every((v) => !v);
  }

  function validateStep3(): boolean {
    const e: Errors = {};
    e.username = validateUsername(form.username);
    if (!e.username && usernameStatus === "taken") e.username = "این نام کاربری قبلاً ثبت شده است";
    if (!e.username && usernameStatus !== "available" && usernameStatus !== "idle") {
      e.username = "در حال بررسی در دسترس بودن نام کاربری...";
    }
    e.password = validatePassword(form.password);
    e.passwordRepeat = validatePasswordMatch(form.password, form.passwordRepeat);
    setErrors(e);
    return Object.values(e).every((v) => !v);
  }

  const next = () => {
    setApiError(null);
    if (step === 0 && validateStep1()) setStep(1);
    else if (step === 1 && validateStep2()) setStep(2);
  };

  const submit = async () => {
    if (!validateStep3()) return;
    setLoading(true);
    setApiError(null);
    const { passwordRepeat: _repeat, ...input } = form;
    const result = await register(input);
    setLoading(false);
    if (result.ok) {
      navigate("/", { replace: true });
    } else {
      setApiError(errorMessages[result.error ?? "server_error"]);
    }
  };

  /* ---------- render ---------- */

  return (
    <AuthShell
      title="ثبت‌نام دانش‌آموز"
      subtitle="با تکمیل این فرم، حساب دانش‌آموزی شما در سامانه مدرسه ساخته می‌شود."
      footer={
        <>
          قبلاً ثبت‌نام کرده‌اید؟{" "}
          <Link to="/login" className="font-bold text-aurora-500 transition-colors hover:text-aurora-400">
            ورود به سامانه
          </Link>
        </>
      }
    >
      <div className="mb-6">
        <Stepper steps={["اطلاعات شخصی", "اطلاعات تحصیلی", "حساب کاربری"]} current={step} />
      </div>

      {apiError && <Alert variant="error" className="mb-4">{apiError}</Alert>}

      {/* step content */}
      <div key={step} className="page-enter space-y-4">
        {step === 0 && (
          <>
            <AvatarInput value={form.avatar} onChange={(v) => set("avatar", v)} />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="نام" required error={errors.firstName}>
                <input className={inputCls(!!errors.firstName)} value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="مثلاً امیر" />
              </Field>
              <Field label="نام خانوادگی" required error={errors.lastName}>
                <input className={inputCls(!!errors.lastName)} value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="مثلاً نجفی" />
              </Field>
              <Field label="نام پدر" required error={errors.fatherName}>
                <input className={inputCls(!!errors.fatherName)} value={form.fatherName} onChange={(e) => set("fatherName", e.target.value)} placeholder="مثلاً محمد" />
              </Field>
              <Field label="کد ملی" required error={errors.nationalId} hint="۱۰ رقم، بدون خط تیره">
                <input className={inputCls(!!errors.nationalId)} value={form.nationalId} onChange={(e) => set("nationalId", e.target.value)} placeholder="0012345678" dir="ltr" inputMode="numeric" maxLength={10} />
              </Field>
            </div>

            <Field label="تاریخ تولد" required error={errors.birthDate as string | undefined}>
              <div className="grid grid-cols-3 gap-2.5">
                <select className={selectCls} value={form.birthDate.jd} onChange={(e) => set("birthDate", { ...form.birthDate, jd: Number(e.target.value) })}>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{toFa(d)}</option>
                  ))}
                </select>
                <select className={selectCls} value={form.birthDate.jm} onChange={(e) => set("birthDate", { ...form.birthDate, jm: Number(e.target.value) })}>
                  {JALALI_MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
                <select className={selectCls} value={form.birthDate.jy} onChange={(e) => set("birthDate", { ...form.birthDate, jy: Number(e.target.value) })}>
                  {years.map((y) => (
                    <option key={y} value={y}>{toFa(y)}</option>
                  ))}
                </select>
              </div>
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="شماره تماس" required error={errors.phone}>
                <input className={inputCls(!!errors.phone)} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="09121234567" dir="ltr" inputMode="numeric" maxLength={11} />
              </Field>
              <Field label="ایمیل" error={errors.email} hint="اختیاری">
                <input className={inputCls(!!errors.email)} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="name@example.com" dir="ltr" type="email" />
              </Field>
            </div>
          </>
        )}

        {step === 1 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="پایه تحصیلی" required error={errors.grade}>
              <select className={selectCls} value={form.grade} onChange={(e) => set("grade", e.target.value)}>
                {GRADES.map((g) => <option key={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="رشته" required error={errors.field}>
              <select className={selectCls} value={form.field} onChange={(e) => set("field", e.target.value)}>
                {FIELDS.map((f) => <option key={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="کلاس" required error={errors.className}>
              <select className={selectCls} value={form.className} onChange={(e) => set("className", e.target.value)}>
                {(CLASS_NUMBERS_BY_GRADE[form.grade] ?? CLASS_NUMBERS_BY_GRADE["یازدهم"]).map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="سال تحصیلی" required>
              <select className={selectCls} value={form.academicYear} onChange={(e) => set("academicYear", e.target.value)}>
                {["۱۴۰۴–۱۴۰۵", "۱۴۰۳–۱۴۰۴"].map((y) => <option key={y}>{y}</option>)}
              </select>
            </Field>
            <Field label="شماره دانش‌آموزی" required error={errors.studentNumber} className="sm:col-span-2">
              <input className={inputCls(!!errors.studentNumber)} value={form.studentNumber} onChange={(e) => set("studentNumber", e.target.value)} placeholder="مثلاً 4031" dir="ltr" inputMode="numeric" />
            </Field>
          </div>
        )}

        {step === 2 && (
          <>
            <Field label="نام کاربری" required error={errors.username}>
              <div className="relative">
                <input
                  className={`${inputCls(!!errors.username)} pl-10`}
                  value={form.username}
                  onChange={(e) => set("username", e.target.value)}
                  placeholder="example_user"
                  dir="ltr"
                  autoComplete="username"
                />
                {usernameStatus !== "idle" && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2">
                    {usernameStatus === "checking" && (
                      <svg className="h-4.5 w-4.5 animate-spin text-ink3" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                        <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                    )}
                    {usernameStatus === "available" && (
                      <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    {usernameStatus === "taken" && (
                      <svg className="h-5 w-5 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                    )}
                  </span>
                )}
              </div>
              {usernameStatus === "available" && !errors.username && (
                <p className="msg-in mt-1.5 flex items-center gap-1 text-[11.5px] font-medium text-emerald-500">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  این نام کاربری آزاد است
                </p>
              )}
            </Field>

            <Field label="رمز عبور" required error={errors.password}>
              <PasswordField value={form.password} onChange={(v) => set("password", v)} autoComplete="new-password" placeholder="ترکیب حروف، رقم و کاراکتر خاص" hasError={!!errors.password} />
              <PasswordMeter password={form.password} />
            </Field>

            <Field label="تکرار رمز عبور" required error={errors.passwordRepeat}>
              <PasswordField value={form.passwordRepeat} onChange={(v) => set("passwordRepeat", v)} autoComplete="new-password" placeholder="تکرار رمز عبور" hasError={!!errors.passwordRepeat} />
              {form.passwordRepeat && !errors.passwordRepeat && (
                <p className="msg-in mt-1.5 flex items-center gap-1 text-[11.5px] font-medium text-emerald-500">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  رمزها یکسان هستند
                </p>
              )}
            </Field>
          </>
        )}
      </div>

      {/* navigation */}
      <div className="mt-6 flex items-center gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={() => { setStep((s) => s - 1); setApiError(null); }}
            className="btn btn-ghost gap-1.5"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-3l3 3 3-3" transform="rotate(180 12 12)" />
            </svg>
            قبلی
          </button>
        )}

        {step < 2 ? (
          <SubmitButton type="button" onClick={next} className="ft-sheen">
            مرحله بعد
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-6 6m6-6l6 6" transform="rotate(180 12 12)" />
            </svg>
          </SubmitButton>
        ) : (
          <SubmitButton type="button" onClick={submit} loading={loading} className="ft-sheen">
            {loading ? "در حال ایجاد حساب..." : "ساخت حساب و ورود"}
          </SubmitButton>
        )}
      </div>

      <p className="mt-5 flex items-start gap-2 text-[11px] leading-6 text-ink3">
        <svg className="mt-1 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
        اطلاعات شما محرمانه است؛ رمز عبور به‌صورت رمزنگاری‌شده (PBKDF2) ذخیره می‌شود و هرگز به‌صورت متن ساده نگهداری نمی‌شود.
      </p>
    </AuthShell>
  );
}
