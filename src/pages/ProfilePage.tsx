import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AvatarInput from "../components/ui/AvatarInput";
import Alert from "../components/ui/Alert";
import Field from "../components/ui/Field";
import PasswordField from "../components/ui/PasswordField";
import PasswordMeter from "../components/ui/PasswordMeter";
import SubmitButton from "../components/ui/SubmitButton";
import { useAuth } from "../auth/AuthContext";
import { api, errorMessages, roleLabels } from "../lib/api";
import { validatePhone, validateEmail } from "../lib/validation";
import { toFa } from "../utils/fa";

export default function ProfilePage() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [avatar, setAvatar] = useState(user?.avatar);
  const [saveLoading, setSaveLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [repeatPw, setRepeatPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!user) return null;

  const saveProfile = async () => {
    const phoneError = validatePhone(phone);
    const emailError = validateEmail(email);
    if (phoneError || emailError) {
      setProfileMsg({ type: "error", text: phoneError ?? emailError! });
      return;
    }
    setSaveLoading(true);
    setProfileMsg(null);
    const result = await api.updateProfile(user.id, { phone, email, avatar });
    setSaveLoading(false);
    if (result.ok) {
      refreshUser(result.data);
      setEditing(false);
      setProfileMsg({ type: "success", text: "اطلاعات پروفایل با موفقیت ذخیره شد" });
    } else {
      setProfileMsg({ type: "error", text: errorMessages[result.error] });
    }
  };

  const changePassword = async () => {
    if (!currentPw) {
      setPwMsg({ type: "error", text: "رمز عبور فعلی را وارد کنید" });
      return;
    }
    if (newPw !== repeatPw) {
      setPwMsg({ type: "error", text: "تکرار رمز عبور با رمز جدید یکسان نیست" });
      return;
    }
    setPwLoading(true);
    setPwMsg(null);
    const result = await api.changePassword(user.id, currentPw, newPw);
    setPwLoading(false);
    if (result.ok) {
      setCurrentPw("");
      setNewPw("");
      setRepeatPw("");
      setPwMsg({ type: "success", text: "رمز عبور با موفقیت تغییر کرد" });
    } else {
      setPwMsg({ type: "error", text: errorMessages[result.error] });
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.trim() || "؟";
  const birth = `${toFa(user.birthDate.jd)} ${["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"][user.birthDate.jm - 1]} ${toFa(user.birthDate.jy)}`;

  const infoItems = [
    { label: "نام و نام خانوادگی", value: `${user.firstName} ${user.lastName}` },
    { label: "نام پدر", value: user.fatherName },
    { label: "تاریخ تولد", value: birth },
    { label: "کد ملی", value: toFa(user.nationalId) },
    { label: "پایه تحصیلی", value: user.grade },
    { label: "رشته", value: user.field },
    { label: "کلاس", value: user.className },
    { label: "سال تحصیلی", value: user.academicYear },
    { label: "شماره دانش‌آموزی", value: toFa(user.studentNumber) },
    { label: "نام کاربری", value: user.username },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* header card */}
      <section className="glass anim-fade-up rounded-3xl p-6">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          {editing ? (
            <AvatarInput value={avatar} onChange={setAvatar} size={84} />
          ) : user.avatar ? (
            <img src={user.avatar} alt="" className="h-[84px] w-[84px] rounded-3xl object-cover ring-1 ring-line" />
          ) : (
            <div className="flex h-[84px] w-[84px] items-center justify-center rounded-3xl bg-gradient-to-br from-aurora-400 via-aurora-600 to-purple-700 text-2xl font-black text-white ring-1 ring-line">
              {initials}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[18px] font-black text-ink">
                {user.firstName} {user.lastName}
              </h1>
              <span className="rounded-full border border-aurora-500/30 bg-aurora-500/10 px-3 py-0.5 text-[11px] font-bold text-aurora-500">
                {roleLabels[user.role]}
              </span>
            </div>
            <p className="mt-1 text-[12.5px] text-ink3">
              پایه {user.grade} · رشته {user.field} · کلاس {user.className}
            </p>
          </div>

          {!editing && (
            <button
              type="button"
              onClick={() => { setEditing(true); setProfileMsg(null); }}
              className="btn btn-secondary btn-sm gap-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
              </svg>
              ویرایش
            </button>
          )}
        </div>

        {profileMsg && <Alert variant={profileMsg.type} className="mt-4">{profileMsg.text}</Alert>}

        {editing && (
          <div className="mt-5 grid grid-cols-1 gap-4 border-t border-line pt-5 sm:grid-cols-2">
            <Field label="شماره تماس" required>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                dir="ltr"
                className="h-11 w-full rounded-xl border border-line bg-card2/60 px-4 text-left text-[13.5px] text-ink outline-none focus:border-aurora-500/50"
              />
            </Field>
            <Field label="ایمیل">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                dir="ltr"
                className="h-11 w-full rounded-xl border border-line bg-card2/60 px-4 text-left text-[13.5px] text-ink outline-none focus:border-aurora-500/50"
              />
            </Field>
            <div className="flex gap-3 sm:col-span-2">
              <SubmitButton type="button" onClick={saveProfile} loading={saveLoading} className="w-auto px-6">
                {saveLoading ? "در حال ذخیره..." : "ذخیره تغییرات"}
              </SubmitButton>
              <button
                type="button"
                onClick={() => { setEditing(false); setPhone(user.phone); setEmail(user.email ?? ""); setAvatar(user.avatar); }}
                className="btn btn-ghost"
              >
                انصراف
              </button>
            </div>
          </div>
        )}
      </section>

      {/* educational info (read-only for students) */}
      <section className="glass anim-fade-up rounded-3xl p-6" style={{ animationDelay: "80ms" }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-extrabold text-ink">اطلاعات آموزشی</h2>
          {user.role === "student" && (
            <span className="text-[10.5px] font-semibold text-ink3">ویرایش اطلاعات تحصیلی توسط مدیریت مدرسه انجام می‌شود</span>
          )}
        </div>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {infoItems.map((item) => (
            <div key={item.label} className="rounded-xl border border-line bg-aurora-500/5 px-3.5 py-2.5">
              <dt className="text-[10.5px] text-ink3">{item.label}</dt>
              <dd className="mt-0.5 truncate text-[13px] font-bold text-ink" title={item.value} dir="auto">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* change password */}
      <section className="glass anim-fade-up rounded-3xl p-6" style={{ animationDelay: "140ms" }}>
        <h2 className="mb-1 text-[15px] font-extrabold text-ink">تغییر رمز عبور</h2>
        <p className="mb-4 text-[12px] text-ink3">برای امنیت بیشتر، رمز عبور خود را به‌صورت دوره‌ای تغییر دهید.</p>

        {pwMsg && <Alert variant={pwMsg.type} className="mb-4">{pwMsg.text}</Alert>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="رمز عبور فعلی" required>
            <PasswordField value={currentPw} onChange={setCurrentPw} autoComplete="current-password" />
          </Field>
          <Field label="رمز عبور جدید" required>
            <PasswordField value={newPw} onChange={setNewPw} autoComplete="new-password" />
          </Field>
          <Field label="تکرار رمز جدید" required>
            <PasswordField value={repeatPw} onChange={setRepeatPw} autoComplete="new-password" />
          </Field>
        </div>

        {newPw && <PasswordMeter password={newPw} />}

        <div className="mt-5">
          <SubmitButton type="button" onClick={changePassword} loading={pwLoading} className="w-auto px-6">
            {pwLoading ? "در حال تغییر..." : "تغییر رمز عبور"}
          </SubmitButton>
        </div>
      </section>

      {/* account settings */}
      <section className="glass anim-fade-up rounded-3xl p-6" style={{ animationDelay: "200ms" }}>
        <h2 className="mb-4 text-[15px] font-extrabold text-ink">تنظیمات حساب</h2>
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3 rounded-xl border border-line bg-aurora-500/5 px-4 py-3">
            <svg className="h-5 w-5 text-aurora-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
            <div>
              <p className="text-[12.5px] font-bold text-ink">خروج از حساب کاربری</p>
              <p className="text-[11px] text-ink3">نشست شما در این دستگاه پایان می‌یابد</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="btn btn-danger gap-2"
          >
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            خروج
          </button>
        </div>
      </section>
    </div>
  );
}
