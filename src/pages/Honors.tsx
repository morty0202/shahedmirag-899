import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import Alert from "../components/ui/Alert";
import SubmitButton from "../components/ui/SubmitButton";
import { createHonor, deleteHonor, listHonors, type Honor } from "../lib/api/content";
import { emitNotificationsRefresh } from "../lib/events";

export default function Honors() {
  const { user } = useAuth();
  const canManage = user?.role === "admin";

  const [items, setItems] = useState<Honor[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", badge: "تقدیر" });
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const reload = () =>
    listHonors()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));

  useEffect(() => {
    reload();
  }, []);

  const submit = async () => {
    if (!form.title.trim()) {
      setMsg({ type: "error", text: "عنوان افتخار را وارد کنید" });
      return;
    }
    setAdding(true);
    const result = await createHonor({
      title: form.title.trim(),
      description: form.description.trim(),
      badge: form.badge.trim(),
      badgeColor: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    });
    setAdding(false);
    if (result.ok) {
      setForm({ title: "", description: "", badge: "تقدیر" });
      setMsg({ type: "success", text: "افتخار جدید ثبت شد" });
      reload();
      emitNotificationsRefresh();
    } else {
      setMsg({ type: "error", text: "ثبت افتخار با خطا مواجه شد" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass aurora-border rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-ink mb-1">افتخارات</h2>
        <p className="text-sm text-ink2">
          موفقیت‌ها و افتخارات دانش‌آموزان دبیرستان شاهد معراج
        </p>
      </div>

      {msg && <Alert variant={msg.type}>{msg.text}</Alert>}

      {/* admin add form */}
      {canManage && (
        <section className="glass aurora-border rounded-2xl p-5">
          <h3 className="mb-3 text-[14px] font-extrabold text-ink">ثبت افتخار جدید</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="عنوان (مثلاً المپیاد ریاضی)"
              className="h-11 w-full rounded-xl border border-line bg-card2/60 px-4 text-[13px] text-ink outline-none focus:border-aurora-500/50"
            />
            <input
              value={form.badge}
              onChange={(e) => setForm({ ...form, badge: e.target.value })}
              placeholder="نشان (طلا، نقره، ...)"
              className="h-11 w-full rounded-xl border border-line bg-card2/60 px-4 text-[13px] text-ink outline-none focus:border-aurora-500/50"
            />
          </div>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="توضیح کوتاه"
            rows={2}
            className="mt-3 w-full rounded-xl border border-line bg-card2/60 px-4 py-3 text-[13px] text-ink outline-none focus:border-aurora-500/50"
          />
          <div className="mt-3">
            <SubmitButton loading={adding} onClick={submit} className="!w-auto px-6">
              {adding ? "در حال ثبت..." : "ثبت افتخار"}
            </SubmitButton>
          </div>
        </section>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass aurora-border rounded-xl p-5">
              <div className="skel h-4 w-32" />
              <div className="skel mt-3 h-3 w-full" />
              <div className="skel mt-2 h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => (
            <div
              key={item.id}
              className="card-hover glass aurora-border aurora-border-hover rounded-xl p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-base font-bold text-ink">{item.title}</h3>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full border shrink-0 ${
                    item.badgeColor || "bg-amber-500/15 text-amber-400 border-amber-500/30"
                  }`}
                >
                  {item.badge}
                </span>
              </div>
              <p className="text-sm text-ink2 leading-relaxed">{item.description}</p>
              {canManage && (
                <button
                  type="button"
                  onClick={async () => {
                    await deleteHonor(item.id);
                    reload();
                  }}
                  className="mt-4 text-[11px] font-bold text-ink3 hover:text-error transition-colors"
                >
                  حذف
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
