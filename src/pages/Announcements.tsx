import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import Alert from "../components/ui/Alert";
import SubmitButton from "../components/ui/SubmitButton";
import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  type Announcement,
} from "../lib/api/content";
import { emitNotificationsRefresh } from "../lib/events";

function fmtDate(iso: string): string {
  try {
    return new Date(iso.replace(" ", "T") + "Z").toLocaleDateString("fa-IR");
  } catch {
    return iso;
  }
}

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const canManage = user?.role === "teacher" || user?.role === "admin";

  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", body: "" });
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const reload = () =>
    listAnnouncements()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));

  useEffect(() => {
    reload();
  }, []);

  const submit = async () => {
    if (!form.title.trim()) {
      setMsg({ type: "error", text: "عنوان اطلاعیه را وارد کنید" });
      return;
    }
    setAdding(true);
    const result = await createAnnouncement({ title: form.title.trim(), body: form.body.trim() });
    setAdding(false);
    if (result.ok) {
      setForm({ title: "", body: "" });
      setMsg({ type: "success", text: "اطلاعیه منتشر شد" });
      reload();
      emitNotificationsRefresh();
    } else {
      setMsg({ type: "error", text: "انتشار اطلاعیه با خطا مواجه شد" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-l from-aurora-500/5 to-transparent pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-aurora-500 to-aurora-700 text-white shadow-lg shadow-aurora-500/20">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-ink">اطلاعیه‌ها</h2>
            <p className="mt-1 text-sm text-ink2">
              آخرین اخبار و اطلاعیه‌های مدرسه شاهد معراج
            </p>
          </div>
        </div>
      </div>

      {msg && <Alert variant={msg.type}>{msg.text}</Alert>}

      {canManage && (
        <section className="glass rounded-2xl overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <h3 className="text-[14px] font-extrabold text-ink flex items-center gap-2">
              <svg className="h-4 w-4 text-aurora-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              انتشار اطلاعیه جدید
            </h3>
          </div>
          <div className="p-5 space-y-3">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <svg className="h-4 w-4 text-ink3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.012z" />
                </svg>
              </div>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="عنوان اطلاعیه"
                className="h-11 w-full rounded-xl border border-line bg-card2/60 pr-10 pl-4 text-[13px] text-ink outline-none focus:border-aurora-500/50 focus:ring-4 focus:ring-aurora-500/10 transition-all"
              />
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 right-3 top-3 flex items-center">
                <svg className="h-4 w-4 text-ink3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </div>
              <textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="متن اطلاعیه..."
                rows={3}
                className="w-full rounded-xl border border-line bg-card2/60 pr-10 pl-4 py-3 text-[13px] text-ink outline-none focus:border-aurora-500/50 focus:ring-4 focus:ring-aurora-500/10 transition-all resize-none"
              />
            </div>
            <div className="flex justify-end">
              <SubmitButton loading={adding} onClick={submit} className="!w-auto px-6">
                {adding ? "در حال انتشار..." : "انتشار اطلاعیه"}
              </SubmitButton>
            </div>
          </div>
        </section>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="glass rounded-2xl p-5">
              <div className="skel h-4 w-52" />
              <div className="skel mt-3 h-3 w-full" />
              <div className="skel mt-2 h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="card-hover glass rounded-2xl overflow-hidden group"
            >
              <div className="flex items-stretch">
                <div className="w-1 shrink-0 bg-gradient-to-b from-aurora-500 to-aurora-700 opacity-60 group-hover:opacity-100 transition-opacity" />
                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-[15px] font-extrabold text-ink leading-relaxed">{item.title}</h3>
                    {canManage && (
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteAnnouncement(item.id);
                          reload();
                        }}
                        className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-ink3 hover:bg-error/10 hover:text-error transition-all"
                        title="حذف"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.061-.94-1.75-1.839-1.75h-7.5c-.899 0-1.839.689-1.839 1.75v.916" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-[13px] leading-7 text-ink2">{item.body}</p>
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-ink3">
                    <div className="flex items-center gap-1.5">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-aurora-500/10 text-aurora-500">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                      </div>
                      <span className="font-medium">{item.authorName}</span>
                    </div>
                    <span className="text-line">·</span>
                    <span>{fmtDate(item.createdAt)}</span>
                  </div>
                </div>
              </div>
            </article>
          ))}
          {items.length === 0 && (
            <div className="glass rounded-2xl p-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-aurora-500/10 text-aurora-500">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              </div>
              <p className="text-ink3">هنوز اطلاعیه‌ای منتشر نشده است</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}