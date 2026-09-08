/** Shared API contract — swap the mock adapter for a real REST client later. */

export type Role = "student" | "teacher" | "admin";

export interface User {
  id: string;
  role: Role;
  username: string;
  firstName: string;
  lastName: string;
  fatherName: string;
  birthDate: { jy: number; jm: number; jd: number };
  nationalId: string;
  phone: string;
  email?: string;
  avatar?: string; // data URL
  grade: string;
  className: string;
  field: string;
  academicYear: string;
  studentNumber: string;
  createdAt: string;
}

export interface Session {
  token: string;
  user: User;
  expiresAt: number;
  remember: boolean;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  fatherName: string;
  birthDate: { jy: number; jm: number; jd: number };
  nationalId: string;
  phone: string;
  email?: string;
  avatar?: string;
  grade: string;
  className: string;
  field: string;
  academicYear: string;
  studentNumber: string;
  username: string;
  password: string;
}

export type ApiError =
  | "invalid_credentials"
  | "account_locked"
  | "username_taken"
  | "national_id_taken"
  | "not_found"
  | "invalid_code"
  | "wrong_password"
  | "weak_password"
  | "server_offline"
  | "server_error";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export interface AuthApi {
  register(input: RegisterInput): Promise<ApiResult<Session>>;
  login(username: string, password: string, remember: boolean): Promise<ApiResult<Session>>;
  logout(token: string): Promise<void>;
  getSession(token: string): Promise<Session | null>;
  checkUsername(username: string): Promise<{ available: boolean }>;
  requestReset(identifier: string): Promise<ApiResult<{ demoCode: string }>>;
  completeReset(identifier: string, code: string, newPassword: string): Promise<ApiResult<null>>;
  changePassword(userId: string, current: string, next: string): Promise<ApiResult<null>>;
  updateProfile(userId: string, patch: { phone?: string; email?: string; avatar?: string }): Promise<ApiResult<User>>;
}

export const errorMessages: Record<ApiError, string> = {
  invalid_credentials: "نام کاربری یا رمز عبور نادرست است",
  account_locked: "به دلیل تلاش‌های ناموفق، حساب موقتاً قفل شده است. کمی بعد دوباره تلاش کنید",
  username_taken: "این نام کاربری قبلاً ثبت شده است",
  national_id_taken: "این کد ملی قبلاً در سامانه ثبت شده است",
  not_found: "کاربری با این مشخصات یافت نشد",
  invalid_code: "کد بازیابی نادرست یا منقضی شده است",
  wrong_password: "رمز عبور فعلی نادرست است",
  weak_password: "رمز جدید به اندازه کافی قوی نیست",
  server_offline:
    "سرور در دسترس نیست؛ ابتدا آن را اجرا کنید (در پوشه پروژه: npm run dev:all) و دوباره تلاش کنید.",
  server_error: "خطایی رخ داد؛ لطفاً دوباره تلاش کنید",
};

export const roleLabels: Record<Role, string> = {
  student: "دانش‌آموز",
  teacher: "معلم",
  admin: "مدیر مدرسه",
};
