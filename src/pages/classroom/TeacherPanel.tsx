import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Alert from "../../components/ui/Alert";
import Field from "../../components/ui/Field";
import SubmitButton from "../../components/ui/SubmitButton";
import { useAuth } from "../../auth/AuthContext";
import {
  attendanceOf,
  createSession,
  deleteSession,
  listSessions,
  type ClassSession,
} from "../../lib/api/restClassrooms";
import { toFa } from "../../utils/fa";

const JALALI_MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
const SUBJECTS = ["ریاضی", "فیزیک", "شیمی", "زیست‌شناسی", "عربی", "فارسی", "زبان انگلیسی", "دین و زندگی"];
const GRADES = ["دهم", "یازدهم", "دوازدهم"];

const inputCls =
  "h-11 w-full rounded-xl border border-line bg-card2/60 px-4 text-[13.5px] text-ink outline-none transition-all focus:border-aurora-500/50";
const selectCls = "h-11 w-full appearance-none rounded-xl border border-line bg-card2/60 px-4 text-[13.5px] font-semibold text-ink outline-none focus:border-aurora-500/50";

export default function TeacherPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [saved, setSaved] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // form
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [grade, setGrade] = useState("یازدهم");
  const [jd, setJd] = useState(20);
  const [jm, setJm] = useState(6);
  const [jy, setJy] = useState(1404);
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState(60);
  const [formError, setFormError] = useState<string | null>(null);

  // attendance viewer
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<{ name: string; role: string; joins: number; lastJoin: number }[]>([]);

  const reload = () => listSessions().then(setSessions);
  useEffect(() => {
    reload();
  }, []);

  // load attendance for the selected session
  useEffect(() => {
    if (!selectedRoom) {
      setAttendance([]);
      return;
    }
    let cancelled = false;
    attendanceOf(selectedRoom)
      .then((rows) => {
        if (!cancelled) setAttendance(rows);
      })
      .catch(() => {
        if (!cancelled) setAttendance([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedRoom]);

  const years = useMemo(() => [1404, 1405, 1406], []);

  const submit = async () => {
    if (!title.trim()) {
      setFormError("عنوان کلاس را وارد کنید");
      return;
    }
    setCreating(true);
    setFormError(null);
    const created = await createSession({
      title: title.trim(),
      subject,
      grade,
      date: { jy, jm, jd },
      time,
      durationMin: duration,
      teacherName: user ? `${user.firstName} ${user.lastName}` : "معلم",
    });
    setCreating(false);
    setTitle("");
    setSaved(`کلاس «${created.title}» با کد ${toFa(created.roomCode)} ثبت شد`);
    window.setTimeout(() => setSaved(null), 4000);
    reload();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="glass anim-fade-up rounded-3xl p-6">
        <h1 className="text-[18px] font-black text-ink">پنل معلم — برنامه‌ریزی کلاس آنلاین</h1>
        <p className="mt-1 text-[12.5px] leading-7 text-ink3">
          کلاس زمان‌بندی کنید، جلسه را شروع کنید و حضور و غیاب دانش‌آموزان را ببینید.
        </p>
      </section>

      {saved && <Alert variant="success">{saved}</Alert>}

      {/* schedule form */}
      <section className="glass anim-fade-up rounded-3xl p-6" style={{ animationDelay: "80ms" }}>
        <h2 className="mb-4 text-[14.5px] font-extrabold text-ink">ایجاد کلاس جدید</h2>

        {formError && <Alert variant="error" className="mb-4">{formError}</Alert>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="عنوان کلاس" required className="sm:col-span-2">
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثلاً حل تمرین فصل ۵ — معادله دیفرانسیل" />
          </Field>
          <Field label="درس">
            <select className={selectCls} value={subject} onChange={(e) => setSubject(e.target.value)}>
              {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="پایه">
            <select className={selectCls} value={grade} onChange={(e) => setGrade(e.target.value)}>
              {GRADES.map((g) => <option key={g}>{g}</option>)}
            </select>
          </Field>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="روز">
            <select className={selectCls} value={jd} onChange={(e) => setJd(Number(e.target.value))}>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{toFa(d)}</option>)}
            </select>
          </Field>
          <Field label="ماه">
            <select className={selectCls} value={jm} onChange={(e) => setJm(Number(e.target.value))}>
              {JALALI_MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </Field>
          <Field label="سال">
            <select className={selectCls} value={jy} onChange={(e) => setJy(Number(e.target.value))}>
              {years.map((y) => <option key={y} value={y}>{toFa(y)}</option>)}
            </select>
          </Field>
          <Field label="ساعت">
            <input type="time" className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} dir="ltr" />
          </Field>
        </div>

        <div className="mt-4 max-w-xs">
          <Field label="مدت جلسه (دقیقه)">
            <select className={selectCls} value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              {[45, 60, 90].map((d) => <option key={d} value={d}>{toFa(d)}</option>)}
            </select>
          </Field>
        </div>

        <div className="mt-5">
          <SubmitButton type="button" onClick={submit} loading={creating} className="w-auto px-6">
            {creating ? "در حال ثبت..." : "ثبت کلاس"}
          </SubmitButton>
        </div>
      </section>

      {/* upcoming + attendance */}
      <section className="glass anim-fade-up rounded-3xl p-6" style={{ animationDelay: "140ms" }}>
        <h2 className="mb-4 text-[14.5px] font-extrabold text-ink">کلاس‌های ثبت‌شده</h2>

        {sessions.length === 0 ? (
          <p className="py-6 text-center text-[12.5px] text-ink3">هنوز کلاسی ثبت نشده است.</p>
        ) : (
          <div className="space-y-2.5">
            {sessions.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-aurora-500/5 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-ink">{s.title}</p>
                  <p className="text-[11px] text-ink3">
                    {s.subject} · پایه {toFa(s.grade)} · {toFa(s.date.jd)} {JALALI_MONTHS[s.date.jm - 1]} · ساعت {toFa(s.time)} · کد {toFa(s.roomCode)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRoom(selectedRoom === s.roomCode ? null : s.roomCode)}
                  className="btn btn-secondary btn-sm"
                >
                  حضور و غیاب
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/classes/room/${s.roomCode}`)}
                  className="btn btn-success btn-sm"
                >
                  شروع جلسه
                </button>
                <button
                  type="button"
                  onClick={async () => { await deleteSession(s.id); reload(); }}
                  aria-label="حذف کلاس"
                  className="btn btn-danger btn-sm"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>

                {selectedRoom === s.roomCode && (
                  <div className="msg-in w-full rounded-2xl border border-line bg-card2/60 p-4">
                    <p className="mb-3 text-[11.5px] font-extrabold text-ink2">
                      حضور و غیاب «{s.title}»
                    </p>
                    {attendance.length === 0 ? (
                      <p className="text-[11.5px] text-ink3">هنوز وارد/خروجی برای این کلاس ثبت نشده است.</p>
                    ) : (
                      <table className="w-full text-right text-[11.5px]">
                        <thead>
                          <tr className="text-ink3">
                            <th className="pb-2 font-bold">نام</th>
                            <th className="pb-2 font-bold">نقش</th>
                            <th className="pb-2 font-bold">تعداد ورود</th>
                            <th className="pb-2 font-bold">آخرین ورود</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendance.map((a) => (
                            <tr key={a.name} className="border-t border-line">
                              <td className="py-2 font-bold text-ink">{a.name}</td>
                              <td className="py-2 text-ink3">{a.role === "student" ? "دانش‌آموز" : a.role === "teacher" ? "معلم" : "مدیر"}</td>
                              <td className="py-2 text-ink2">{toFa(a.joins)}</td>
                              <td className="py-2 text-ink3">{a.lastJoin ? toFa(new Date(a.lastJoin).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })) : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
