/** Persian-first form validation rules with user-facing messages. */

export const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export function toEnglishDigits(value: string): string {
  return value.replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)));
}

export function validatePersianName(value: string): string | null {
  if (!value.trim()) return "این فیلد الزامی است";
  if (value.trim().length < 2) return "نام باید حداقل ۲ حرف باشد";
  if (!/^[\u0600-\u06FF\s]+$/.test(value.trim())) return "نام را فقط با حروف فارسی وارد کنید";
  return null;
}

/** Iranian national ID (کد ملی) — 10 digits + official checksum. */
export function validateNationalId(raw: string): string | null {
  const value = toEnglishDigits(raw).trim();
  if (!value) return "کد ملی الزامی است";
  if (!/^\d{10}$/.test(value)) return "کد ملی باید ۱۰ رقم باشد";
  const check = Number(value[9]);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(value[i]) * (10 - i);
  const remainder = sum % 11;
  const valid = remainder < 2 ? check === remainder : check === 11 - remainder;
  if (!valid) return "کد ملی واردشده معتبر نیست";
  return null;
}

export function validatePhone(raw: string): string | null {
  const value = toEnglishDigits(raw).trim();
  if (!value) return "شماره تماس الزامی است";
  if (!/^09\d{9}$/.test(value)) return "شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد";
  return null;
}

export function validateEmail(value: string): string | null {
  if (!value.trim()) return null; // optional
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())) return "ایمیل واردشده معتبر نیست";
  return null;
}

export function validateUsername(value: string): string | null {
  if (!value.trim()) return "نام کاربری الزامی است";
  if (value.length < 4) return "نام کاربری باید حداقل ۴ کاراکتر باشد";
  if (value.length > 20) return "نام کاربری حداکثر ۲۰ کاراکتر است";
  if (!/^[A-Za-z0-9_.\u0600-\u06FF]+$/.test(value)) return "فقط حروف، رقم، نقطه و زیرخط مجاز است";
  return null;
}

export function validateStudentNumber(raw: string): string | null {
  const value = toEnglishDigits(raw).trim();
  if (!value) return "شماره دانش‌آموزی الزامی است";
  if (!/^\d{4,8}$/.test(value)) return "شماره دانش‌آموزی باید ۴ تا ۸ رقم باشد";
  return null;
}

/* ---------------- password strength ---------------- */

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  color: string;
  checks: { key: string; label: string; passed: boolean }[];
}

export function passwordStrength(pw: string): PasswordStrength {
  const hasLength = pw.length >= 8;
  const hasLong = pw.length >= 12;
  const hasLetter = /[A-Za-z]/.test(pw) || /[\u0600-\u06FF]/.test(pw);
  const hasDigit = /\d/.test(pw);
  const hasCase = /[a-z]/.test(pw) && /[A-Z]/.test(pw);
  const hasSpecial = /[^A-Za-z0-9\u0600-\u06FF]/.test(pw);

  const parts = [hasLength, hasLetter && hasDigit, hasCase || hasSpecial, hasLong];
  const score = parts.filter(Boolean).length as PasswordStrength["score"];

  const labels = ["خیلی ضعیف", "ضعیف", "متوسط", "خوب", "قوی"];
  const colors = ["bg-error", "bg-error", "bg-warning", "bg-aurora-400", "bg-emerald-500"];

  return {
    score,
    label: labels[score],
    color: colors[score],
    checks: [
      { key: "len", label: "حداقل ۸ کاراکتر", passed: hasLength },
      { key: "mix", label: "ترکیب حرف و رقم", passed: hasLetter && hasDigit },
      { key: "case", label: "حروف کوچک و بزرگ یا کاراکتر خاص", passed: hasCase || hasSpecial },
      { key: "long", label: "۱۲ کاراکتر یا بیشتر (امتیاز امنیتی)", passed: hasLong },
    ],
  };
}

/** Acceptable for registration: at least "خوب". */
export function validatePassword(pw: string): string | null {
  if (!pw) return "رمز عبور الزامی است";
  const s = passwordStrength(pw);
  if (pw.length < 8) return "رمز عبور باید حداقل ۸ کاراکتر باشد";
  if (s.score < 3) return "رمز عبور به اندازه کافی قوی نیست؛ ترکیب حروف، رقم و کاراکتر خاص استفاده کنید";
  return null;
}

export function validatePasswordMatch(pw: string, repeat: string): string | null {
  if (!repeat) return "تکرار رمز عبور الزامی است";
  if (pw !== repeat) return "تکرار رمز عبور با رمز اصلی یکسان نیست";
  return null;
}
