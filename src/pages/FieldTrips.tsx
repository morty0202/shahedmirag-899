import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import Alert from "../components/ui/Alert";
import SubmitButton from "../components/ui/SubmitButton";
import {
  createFieldTrip,
  deleteFieldTrip,
  listFieldTrips,
  type FieldTrip,
} from "../lib/api/content";
import { emitNotificationsRefresh } from "../lib/events";

const tripTypes = [
  { label: "علمی", color: "bg-aurora-500/15 text-aurora-400 border-aurora-500/30" },
  { label: "تفریحی", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  { label: "ورزشی", color: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  { label: "فرهنگی", color: "bg-pink-500/15 text-pink-400 border-pink-500/30" },
];

function fmtDate(iso: string): string {
  try {
    return new Date(iso.replace(" ", "T") + "Z").toLocaleDateString("fa-IR");
  } catch {
    return iso;
  }
}

export default function FieldTrips() {
  const { user } = useAuth();
  const canManage = user?.role === "teacher" || user?.role === "admin";

  const [items, setItems] = useState<FieldTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", dateText: "", description: "", type: "علمی" });
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const reload = () =>
    listFieldTrips()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));

  useEffect(() => {
    reload();
  }, []);

  const submit = async () => {
    if (!form.title.trim()) {
      setMsg({ type: "error", text: "عنوان اردو را وارد کنید" });
      return;
    }
    setAdding(true);
    const typeInfo = tripTypes.find(t => t.label === form.type) || tripTypes[0];
    const result = await createFieldTrip({
      title: form.title.trim(),
      dateText: form.dateText.trim(),
      description: form.description.trim(),
      type: form.type,
      typeColor: typeInfo.color,
    });
    setAdding(false);
    if (result.ok) {
      setForm({ title: "", dateText: "", description: "", type: "علمی" });
      setMsg({ type: "success", text: "اردو جدید ثبت شد" });
      reload();
      emitNotificationsRefresh();
    } else {
      setMsg({ type: "error", text: "ثبت اردو با خطا مواجه شد" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-l from-emerald-500/5 to-transparent pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg shadow-emerald-500/20">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 1.657-4.03 3-9 3s-9-1.343-9-3M19.5 10.5c0-1.657-4.03-3-9-3s-9 1.343-9 3m16.5-3H3m16.5 0v6.375c0 1.125-.84 2.063-1.875 2.063H4.125C2.84 18.375 2 17.437 2 16.312V7.5m16.5 0v6.375c0 1.125.84 2.063 1.875 2.063h10.5c1.035 0 1.875-.938 1.875-2.063V7.5" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-ink">اردوهای علمی</h2>
            <p className="mt-1 text-sm text-ink2">لیست اردوهای علمی، تفریحی و آموزشی مدرسه</p>
          </div>
        </div>
      </div>

      {msg && <Alert variant={msg.type}>{msg.text}</Alert>}

      {canManage && (
        <section className="glass rounded-2xl overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <h3 className="text-[14px] font-extrabold text-ink flex items-center gap-2">
              <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              ثبت اردوی جدید
            </h3>
          </div>
          <div className="p-5 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="عنوان اردو"
                className="h-11 w-full rounded-xl border border-line bg-card2/60 px-4 text-[13px] text-ink outline-none focus:border-aurora-500/50 focus:ring-4 focus:ring-aurora-500/10 transition-all"
              />
              <input
                value={form.dateText}
                onChange={(e) => setForm({ ...form, dateText: e.target.value })}
                placeholder="تاریخ (مثلاً ۱۵ آبان ۱۴۰۴)"
                className="h-11 w-full rounded-xl border border-line bg-card2/60 px-4 text-[13px] text-ink outline-none focus:border-aurora-500/50 focus:ring-4 focus:ring-aurora-500/10 transition-all"
              />
            </div>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="h-11 w-full rounded-xl border border-line bg-card2/60 px-4 text-[13px] text-ink outline-none focus:border-aurora-500/50 focus:ring-4 focus:ring-aurora-500/10 transition-all"
            >
              {tripTypes.map(t => (
                <option key={t.label} value={t.label}>{t.label}</option>
              ))}
            </select>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="توضیحات اردو..."
              rows={2}
              className="w-full rounded-xl border border-line bg-card2/60 px-4 py-3 text-[13px] text-ink outline-none focus:border-aurora-500/50 focus:ring-4 focus:ring-aurora-500/10 transition-all resize-none"
            />
            <div className="flex justify-end">
              <SubmitButton loading={adding} onClick={submit} className="!w-auto px-6">
                {adding ? "در حال ثبت..." : "ثبت اردو"}
              </SubmitButton>
            </div>
          </div>
        </section>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass rounded-2xl p-5">
              <div className="skel h-4 w-32" />
              <div className="skel mt-3 h-3 w-full" />
              <div className="skel mt-2 h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => {
            const typeInfo = tripTypes.find(t => t.label === item.type) || tripTypes[0];
            return (
              <div
                key={item.id}
                className="card-hover glass rounded-2xl overflow-hidden group"
              >
                <div className="flex items-stretch">
                  <div className="w-1 shrink-0 bg-gradient-to-b from-emerald-500 to-teal-700 opacity-60 group-hover:opacity-100 transition-opacity" />
                  <div className="flex-1 p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="text-[15px] font-extrabold text-ink leading-relaxed">{item.title}</h3>
                      <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full border shrink-0 ${typeInfo.color}`}>
                        {item.type}
                      </span>
                    </div>
                    {item.dateText && (
                      <div className="flex items-center gap-1.5 text-[12px] text-ink2 mb-2">
                        <svg className="h-3.5 w-3.5 text-ink3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                        </svg>
                        <span>{item.dateText}</span>
                      </div>
                    )}
                    <p className="text-[13px] leading-7 text-ink2">{item.description}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[11px] text-ink3">{fmtDate(item.createdAt)}</span>
                      {canManage && (
                        <button
                          type="button"
                          onClick={async () => {
                            await deleteFieldTrip(item.id);
                            reload();
                          }}
                          className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-ink3 hover:bg-error/10 hover:text-error transition-all"
                          title="حذف"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.061-.94-1.75-1.839-1.75h-7.5c-.899 0-1.839.689-1.839 1.75v.916" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <div className="glass rounded-2xl p-8 text-center md:col-span-2 lg:col-span-3">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 1.657-4.03 3-9 3s-9-1.343-9-3M19.5 10.5c0-1.657-4.03-3-9-3s-9 1.343-9 3m16.5-3H3m16.5 0v6.375c0 1.125-.84 2.063-1.875 2.063H4.125C2.84 18.375 2 17.437 2 16.312V7.5m16.5 0v6.375c0 1.125.84 2.063 1.875 2.063h10.5c1.035 0 1.875-.938 1.875-2.063V7.5" />
                </svg>
              </div>
              <p className="text-ink3">هنوز اردویی ثبت نشده است</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
