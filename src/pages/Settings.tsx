import { useEffect, useState, type FormEvent } from "react";
import Switch from "../components/ui/Switch";
import Alert from "../components/ui/Alert";
import PasswordField from "../components/ui/PasswordField";
import SubmitButton from "../components/ui/SubmitButton";
import { changePassword, getSettings, saveSettings } from "../lib/api/settings";
import { ACCENTS, BACKGROUNDS, useAppearance } from "../appearance/AppearanceContext";
import { useAuth } from "../auth/AuthContext";

type SectionId = "appearance" | "notifications" | "security" | "about";

const SECTIONS: { id: SectionId; label: string; d: string }[] = [
  {
    id: "appearance",
    label: "ظاهر",
    d: "M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42",
  },
  {
    id: "notifications",
    label: "اعلانها",
    d: "M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0",
  },
  {
    id: "security",
    label: "حریم خصوصی و امنیت",
    d: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",
  },
  {
    id: "about",
    label: "درباره",
    d: "M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z",
  },
];

export default function Settings() {
  const { user, logout } = useAuth();
  const { accent, bg, setAccent, setBg } = useAppearance();
  const [section, setSection] = useState<SectionId>("appearance");

  const [theme, setTheme] = useState<"dark" | "light">(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  );
  const [notifyBooklets, setNotifyBooklets] = useState(true);
  const [notifyTrips, setNotifyTrips] = useState(false);
  const [loading, setLoading] = useState(true);

  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [repPw, setRepPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    getSettings()
      .then((s) => {
        setTheme(s.theme);
        setNotifyBooklets(s.notifyBooklets);
        setNotifyTrips(s.notifyTrips);
        document.documentElement.classList.toggle("dark", s.theme === "dark");
        try {
          localStorage.setItem("theme", s.theme);
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        /* server unavailable — keep defaults */
      })
      .finally(() => setLoading(false));
  }, []);

  const applyTheme = (next: "dark" | "light") => {
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* ignore */
    }
    void saveSettings({ theme: next }).catch(() => {});
  };

  const toggle = (key: "notifyBooklets" | "notifyTrips", next: boolean) => {
    if (key === "notifyBooklets") setNotifyBooklets(next);
    else setNotifyTrips(next);
    void saveSettings({ [key]: next } as { notifyBooklets?: boolean; notifyTrips?: boolean }).catch(() => {});
  };

  const submitPassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (!curPw) return setPwMsg({ type: "error", text: "رمز عبور فعلی را وارد کنید" });
    if (newPw.length < 8) return setPwMsg({ type: "error", text: "رمز جدید باید حداقل ۸ کاراکتر باشد" });
    if (newPw !== repPw) return setPwMsg({ type: "error", text: "تکرار رمز جدید مطابقت ندارد" });
    if (newPw === curPw) return setPwMsg({ type: "error", text: "رمز جدید نباید با رمز فعلی یکسان باشد" });
    if (!user?.id) return setPwMsg({ type: "error", text: "ابتدا وارد حساب شوید" });
    setPwLoading(true);
    const res = await changePassword(user.id, curPw, newPw);
    setPwLoading(false);
    if (res.ok) {
      setPwMsg({ type: "success", text: "رمز عبور با موفقیت تغییر کرد 🔒" });
      setCurPw("");
      setNewPw("");
      setRepPw("");
      return;
    }
    const map: Record<string, string> = {
      wrong_password: "رمز عبور فعلی نادرست است",
      weak_password: "رمز جدید ضعیف است؛ ترکیبی از حروف، رقم و کاراکتر خاص استفاده کنید",
      not_found: "کاربر یافت نشد",
    };
    setPwMsg({ type: "error", text: map[res.error ?? ""] ?? "تغییر رمز با خطا مواجه شد" });
  };

  return (
    <div className="space-y-6">
      <div className="glass anim-fade-up rounded-3xl p-6">
        <h2 className="text-2xl font-black text-ink">تنظیمات</h2>
        <p className="mt-1 text-[12.5px] text-ink3">
          {loading ? "در حال بارگذاری تنظیمات..." : "شخصیسازی ظاهر، اعلانها و امنیت حساب"}
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[260px_1fr]">
        {/* section nav */}
        <nav className="glass anim-fade-up flex gap-2 overflow-x-auto rounded-3xl p-3 lg:sticky lg:top-6 lg:flex-col lg:overflow-visible">
          {SECTIONS.map((s) => {
            const active = section === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                className={`flex shrink-0 items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-[12.5px] font-extrabold transition-all duration-200 ${
                  active
                    ? "nav-active text-aurora-500 dark:text-aurora-300"
                    : "text-ink2 hover:bg-aurora-500/5 hover:text-ink"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-colors duration-200 ${
                    active ? "border-aurora-500/40 bg-aurora-500/10 text-aurora-500" : "border-line bg-card2/50 text-ink3"
                  }`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={s.d} />
                  </svg>
                </span>
                {s.label}
              </button>
            );
          })}
        </nav>

        {/* section content */}
        <div key={section} className="anim-fade-up min-w-0 space-y-4">
          {section === "appearance" && (
            <>
              <div className="glass rounded-3xl p-5">
                <h3 className="mb-4 text-[14.5px] font-extrabold text-ink">پوسته</h3>
                <div className="tabs" role="tablist" aria-label="انتخاب پوسته">
                  {(["dark", "light"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="tab"
                      aria-selected={theme === option}
                      onClick={() => applyTheme(option)}
                      className={`tab ${theme === option ? "tab-active" : ""}`}
                    >
                      {option === "dark" ? "تاریک" : "روشن"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="glass rounded-3xl p-5">
                <h3 className="mb-1 text-[14.5px] font-extrabold text-ink">تم رنگی</h3>
                <p className="mb-4 text-[11px] text-ink3">رنگ اصلی سامانه — بلافاصله در همه صفحات اعمال میشود</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {ACCENTS.map((t) => {
                    const active = accent === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setAccent(t.id)}
                        className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-right transition-all duration-200 hover:-translate-y-0.5 ${
                          active
                            ? "border-aurora-500/50 bg-aurora-500/10 shadow-md shadow-aurora-500/10"
                            : "border-line bg-card2/40 hover:border-aurora-500/30"
                        }`}
                      >
                        <span
                          className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                          style={{ background: `linear-gradient(135deg, ${t.swatch2}, ${t.swatch})` }}
                        >
                          {active && (
                            <svg className="h-4 w-4 text-white drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          )}
                        </span>
                        <span className="text-[12.5px] font-extrabold text-ink">{t.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="glass rounded-3xl p-5">
                <h3 className="mb-1 text-[14.5px] font-extrabold text-ink">پسزمینه متحرک</h3>
                <p className="mb-4 text-[11px] text-ink3">جلوه پسزمینه — در تمام صفحات پس از ورود</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {BACKGROUNDS.map((b) => {
                    const active = bg === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setBg(b.id)}
                        className={`overflow-hidden rounded-2xl border text-right transition-all duration-200 hover:-translate-y-0.5 ${
                          active ? "border-aurora-500/50 shadow-md shadow-aurora-500/10" : "border-line hover:border-aurora-500/30"
                        }`}
                      >
                        <span className="block h-14 w-full" style={{ background: b.preview }} />
                        <span className={`block px-3 py-2 ${active ? "bg-aurora-500/10" : "bg-card2/40"}`}>
                          <span className="block text-[12px] font-extrabold text-ink">{b.name}</span>
                          <span className="mt-0.5 block text-[10.5px] text-ink3">{b.desc}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

            </>
          )}

          {section === "notifications" && (
            <div className="glass rounded-3xl p-5">
              <h3 className="mb-4 text-[14.5px] font-extrabold text-ink">اعلانها</h3>
              <div className="space-y-4">
                {[
                  {
                    label: "اعلان آپلود جزوه جدید",
                    description: "دریافت اعلان هنگام انتشار جزوه یا ویدیوی جدید",
                    value: notifyBooklets,
                    onChange: (v: boolean) => toggle("notifyBooklets", v),
                  },
                  {
                    label: "یادآوری اردوها",
                    description: "دریافت یادآوری پیش از زمان هر اردو",
                    value: notifyTrips,
                    onChange: (v: boolean) => toggle("notifyTrips", v),
                  },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-aurora-500/5 px-4 py-3">
                    <div>
                      <p className="text-[13px] font-bold text-ink">{item.label}</p>
                      <p className="mt-0.5 text-[11px] text-ink3">{item.description}</p>
                    </div>
                    <Switch checked={item.value} onChange={item.onChange} label={item.label} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === "security" && (
            <>
              <div className="glass rounded-3xl p-5">
                <h3 className="mb-1 text-[14.5px] font-extrabold text-ink">تغییر رمز عبور</h3>
                <p className="mb-4 text-[11px] text-ink3">برای امنیت بیشتر، هر چند مدت رمز خود را عوض کنید</p>
                <form onSubmit={submitPassword} className="max-w-md space-y-3" noValidate>
                  {pwMsg && <Alert variant={pwMsg.type}>{pwMsg.text}</Alert>}
                  <PasswordField value={curPw} onChange={setCurPw} placeholder="رمز عبور فعلی" autoComplete="current-password" />
                  <PasswordField value={newPw} onChange={setNewPw} placeholder="رمز عبور جدید (حداقل ۸ کاراکتر)" autoComplete="new-password" />
                  <PasswordField value={repPw} onChange={setRepPw} placeholder="تکرار رمز عبور جدید" autoComplete="new-password" />
                  <SubmitButton type="submit" loading={pwLoading} className="ft-sheen">
                    تغییر رمز عبور
                  </SubmitButton>
                </form>
              </div>

              <div className="glass rounded-3xl p-5">
                <h3 className="mb-3 text-[14.5px] font-extrabold text-ink">حریم خصوصی</h3>
                <ul className="space-y-2.5">
                  {[
                    "رمز عبورها با الگوریتم PBKDF2 رمزنگاری میشوند و هرگز بهصورت متن ساده ذخیره نمیشوند",
                    "کلید سرویس هوش مصنوعی فقط روی سرور نگهداری میشود و به مرورگر ارسال نمیشود",
                    "اطلاعات حساب شما تنها در سرور مدرسه ذخیره میشود و با اشخاص ثالث به اشتراک گذاشته نمیشود",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2 text-[12px] leading-6 text-ink2">
                      <svg className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="glass flex flex-wrap items-center justify-between gap-4 rounded-3xl p-5">
                <div>
                  <p className="text-[13px] font-bold text-ink">خروج از حساب</p>
                  <p className="mt-0.5 text-[11px] text-ink3">از این دستگاه خارج میشوید؛ برای ورود مجدد به رمز نیاز دارید</p>
                </div>
                <button type="button" onClick={() => void logout()} className="btn btn-danger shrink-0">
                  خروج از حساب
                </button>
              </div>
            </>
          )}

          {section === "about" && (
            <div className="glass rounded-3xl p-5">
              <h3 className="mb-2 text-[14.5px] font-extrabold text-ink">درباره پلتفرم</h3>
              <p className="text-[12.5px] text-ink2">پلتفرم آموزشی مدرسه شاهد معراج — نسخه ۱.۰</p>
              <p className="mt-2 text-[11px] leading-6 text-ink3">
                طراحی و توسعه برای مدیریت منابع آموزشی، کلاسهای آنلاین و ارتباط مدرسه با دانشآموزان
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}