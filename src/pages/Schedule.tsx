import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import Alert from "../components/ui/Alert";
import SubmitButton from "../components/ui/SubmitButton";
import {
  createScheduleItem,
  deleteScheduleItem,
  listSchedule,
  updateScheduleItem,
  type ScheduleItem,
} from "../lib/api/schedule";

const statusOptions = [
  { value: "upcoming", label: "آینده", color: "bg-aurora-500/15 text-aurora-400 border-aurora-500/30" },
  { value: "done", label: "انجام شده", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  { value: "canceled", label: "لغو شده", color: "bg-red-500/15 text-red-400 border-red-500/30" },
];

export default function Schedule() {
  const { user } = useAuth();
  const canManage = user?.role === "teacher" || user?.role === "admin";

  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ time: "", lesson: "", room: "", teacher: "", status: "upcoming" });
  const [editForm, setEditForm] = useState({ time: "", lesson: "", room: "", teacher: "", status: "upcoming" });
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const reload = () =>
    listSchedule()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));

  useEffect(() => {
    reload();
  }, []);

  const resetForm = () => setForm({ time: "", lesson: "", room: "", teacher: "", status: "upcoming" });

  const submit = async () => {
    if (!form.time.trim() || !form.lesson.trim() || !form.room.trim() || !form.teacher.trim()) {
      setMsg({ type: "error", text: "تمام فیلدها را پر کنید" });
      return;
    }
    setAdding(true);
    try {
      await createScheduleItem(form);
      setMsg({ type: "success", text: "برنامه جدید اضافه شد" });
      resetForm();
      reload();
    } catch {
      setMsg({ type: "error", text: "افزودن برنامه با خطا مواجه شد" });
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (item: ScheduleItem) => {
    setEditingId(item.id);
    setEditForm({ time: item.time, lesson: item.lesson, room: item.room, teacher: item.teacher, status: item.status });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (!editForm.time.trim() || !editForm.lesson.trim() || !editForm.room.trim() || !editForm.teacher.trim()) {
      setMsg({ type: "error", text: "تمام فیلدها را پر کنید" });
      return;
    }
    try {
      await updateScheduleItem(editingId, editForm);
      setMsg({ type: "success", text: "برنامه ویرایش شد" });
      setEditingId(null);
      reload();
    } catch {
      setMsg({ type: "error", text: "ویرایش برنامه با خطا مواجه شد" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("آیا از حذف این مورد اطمینان دارید؟")) return;
    try {
      await deleteScheduleItem(id);
      setMsg({ type: "success", text: "برنامه حذف شد" });
      reload();
    } catch {
      setMsg({ type: "error", text: "حذف برنامه با خطا مواجه شد" });
    }
  };

  const getStatusInfo = (status: string) => statusOptions.find(s => s.value === status) || statusOptions[0];

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-l from-aurora-500/5 to-transparent pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-aurora-500 to-aurora-700 text-white shadow-lg shadow-aurora-500/20">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-ink">برنامه مدرسه</h2>
            <p className="mt-1 text-sm text-ink2">برنامه کلاس‌ها، دروس و فعالیت‌های مدرسه</p>
          </div>
        </div>
      </div>

      {msg && <Alert variant={msg.type}>{msg.text}</Alert>}

      {canManage && !editingId && (
        <section className="glass rounded-2xl overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <h3 className="text-[14px] font-extrabold text-ink flex items-center gap-2">
              <svg className="h-4 w-4 text-aurora-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              افزودن به برنامه
            </h3>
          </div>
          <div className="p-5 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                placeholder="ساعت (مثلاً 08:00)"
                className="h-11 w-full rounded-xl border border-line bg-card2/60 px-4 text-[13px] text-ink outline-none focus:border-aurora-500/50 focus:ring-4 focus:ring-aurora-500/10 transition-all"
              />
              <input
                value={form.lesson}
                onChange={(e) => setForm({ ...form, lesson: e.target.value })}
                placeholder="نام درس"
                className="h-11 w-full rounded-xl border border-line bg-card2/60 px-4 text-[13px] text-ink outline-none focus:border-aurora-500/50 focus:ring-4 focus:ring-aurora-500/10 transition-all"
              />
              <input
                value={form.room}
                onChange={(e) => setForm({ ...form, room: e.target.value })}
                placeholder="اتاق / کلاس"
                className="h-11 w-full rounded-xl border border-line bg-card2/60 px-4 text-[13px] text-ink outline-none focus:border-aurora-500/50 focus:ring-4 focus:ring-aurora-500/10 transition-all"
              />
              <input
                value={form.teacher}
                onChange={(e) => setForm({ ...form, teacher: e.target.value })}
                placeholder="استاد"
                className="h-11 w-full rounded-xl border border-line bg-card2/60 px-4 text-[13px] text-ink outline-none focus:border-aurora-500/50 focus:ring-4 focus:ring-aurora-500/10 transition-all"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="h-11 rounded-xl border border-line bg-card2/60 px-4 text-[13px] text-ink outline-none focus:border-aurora-500/50 focus:ring-4 focus:ring-aurora-500/10 transition-all"
              >
                {statusOptions.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <SubmitButton loading={adding} onClick={submit} className="!w-auto px-6">
                {adding ? "در حال افزودن..." : "افزودن"}
              </SubmitButton>
            </div>
          </div>
        </section>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-2xl p-5">
              <div className="skel h-4 w-32" />
              <div className="skel mt-3 h-3 w-full" />
              <div className="skel mt-2 h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-5 py-3 text-[11px] font-bold text-ink3">ساعت</th>
                  <th className="px-5 py-3 text-[11px] font-bold text-ink3">درس</th>
                  <th className="px-5 py-3 text-[11px] font-bold text-ink3">اتاق</th>
                  <th className="px-5 py-3 text-[11px] font-bold text-ink3">استاد</th>
                  <th className="px-5 py-3 text-[11px] font-bold text-ink3">وضعیت</th>
                  {canManage && <th className="px-5 py-3 text-[11px] font-bold text-ink3">عملیات</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const statusInfo = getStatusInfo(item.status);
                  if (editingId === item.id) {
                    return (
                      <tr key={item.id} className="border-b border-line bg-aurora-500/5">
                        <td className="px-5 py-3">
                          <input value={editForm.time} onChange={(e) => setEditForm({ ...editForm, time: e.target.value })} className="h-9 w-full rounded-lg border border-line bg-card2 px-3 text-[13px] text-ink outline-none focus:border-aurora-500/50" />
                        </td>
                        <td className="px-5 py-3">
                          <input value={editForm.lesson} onChange={(e) => setEditForm({ ...editForm, lesson: e.target.value })} className="h-9 w-full rounded-lg border border-line bg-card2 px-3 text-[13px] text-ink outline-none focus:border-aurora-500/50" />
                        </td>
                        <td className="px-5 py-3">
                          <input value={editForm.room} onChange={(e) => setEditForm({ ...editForm, room: e.target.value })} className="h-9 w-full rounded-lg border border-line bg-card2 px-3 text-[13px] text-ink outline-none focus:border-aurora-500/50" />
                        </td>
                        <td className="px-5 py-3">
                          <input value={editForm.teacher} onChange={(e) => setEditForm({ ...editForm, teacher: e.target.value })} className="h-9 w-full rounded-lg border border-line bg-card2 px-3 text-[13px] text-ink outline-none focus:border-aurora-500/50" />
                        </td>
                        <td className="px-5 py-3">
                          <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="h-9 w-full rounded-lg border border-line bg-card2 px-3 text-[13px] text-ink outline-none focus:border-aurora-500/50">
                            {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </td>
                        {canManage && (
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <button onClick={saveEdit} className="btn btn-sm btn-success">ذخیره</button>
                              <button onClick={() => setEditingId(null)} className="btn btn-sm btn-secondary">لغو</button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  }
                  return (
                    <tr key={item.id} className="border-b border-line last:border-b-0 hover:bg-aurora-500/5 transition-colors">
                      <td className="px-5 py-4 text-[13px] font-bold text-ink">{item.time}</td>
                      <td className="px-5 py-4 text-[13px] text-ink">{item.lesson}</td>
                      <td className="px-5 py-4 text-[13px] text-ink2">{item.room}</td>
                      <td className="px-5 py-4 text-[13px] text-ink2">{item.teacher}</td>
                      <td className="px-5 py-4">
                        <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      {canManage && (
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button onClick={() => startEdit(item)} className="btn btn-icon btn-sm">
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                              </svg>
                            </button>
                            <button onClick={() => handleDelete(item.id)} className="btn btn-icon btn-sm hover:!bg-error/10 hover:!text-error">
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.061-.94-1.75-1.839-1.75h-7.5c-.899 0-1.839.689-1.839 1.75v.916" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={canManage ? 6 : 5} className="px-5 py-8 text-center text-ink3">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-aurora-500/10 text-aurora-500">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                        </svg>
                      </div>
                      <p>هنوز برنامه‌ای ثبت نشده است</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
