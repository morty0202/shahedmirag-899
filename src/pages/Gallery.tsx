import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import Alert from "../components/ui/Alert";
import SubmitButton from "../components/ui/SubmitButton";
import {
  createGalleryItem,
  deleteGalleryItem,
  listGalleryItems,
  type GalleryItem,
} from "../lib/api/content";
import { emitNotificationsRefresh } from "../lib/events";

export default function Gallery() {
  const { user } = useAuth();
  const canManage = user?.role === "admin";

  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [imgUrl, setImgUrl] = useState<string | undefined>(undefined);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const reload = () =>
    listGalleryItems()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));

  useEffect(() => {
    reload();
  }, []);

  const onPickImage = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setMsg({ type: "error", text: "حداکثر حجم تصویر ۲ مگابایت است" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImgUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!imgUrl && !title.trim()) {
      setMsg({ type: "error", text: "عنوان یا تصویر را وارد کنید" });
      return;
    }
    setAdding(true);
    const result = await createGalleryItem({ title: title.trim() || "تصویر", imgUrl });
    setAdding(false);
    if (result.ok) {
      setTitle("");
      setImgUrl(undefined);
      setMsg({ type: "success", text: "تصویر به گالری اضافه شد" });
      reload();
      emitNotificationsRefresh();
    } else {
      setMsg({ type: "error", text: "افزودن تصویر با خطا مواجه شد" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass aurora-border rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-ink mb-1">گالری</h2>
        <p className="text-sm text-ink2">
          آلبوم تصاویر مراسم، اردوها و کلاس‌های مدرسه
        </p>
      </div>

      {msg && <Alert variant={msg.type}>{msg.text}</Alert>}

      {canManage && (
        <section className="glass aurora-border rounded-2xl p-5">
          <h3 className="mb-3 text-[14px] font-extrabold text-ink">افزودن تصویر</h3>
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="عنوان تصویر"
              className="h-11 w-56 rounded-xl border border-line bg-card2/60 px-4 text-[13px] text-ink outline-none focus:border-aurora-500/50"
            />
            <label className="btn btn-secondary btn-sm cursor-pointer">
              {imgUrl ? "تغییر تصویر" : "انتخاب تصویر"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onPickImage(e.target.files?.[0])} />
            </label>
            {imgUrl && <img src={imgUrl} alt="" className="h-11 w-16 rounded-lg object-cover ring-1 ring-line" />}
            <SubmitButton loading={adding} onClick={submit} className="!w-auto px-6">
              {adding ? "در حال افزودن..." : "افزودن"}
            </SubmitButton>
          </div>
        </section>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skel h-44 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <figure
              key={item.id}
              className="card-hover glass aurora-border aurora-border-hover group overflow-hidden rounded-2xl"
            >
              {item.imgUrl ? (
                <img src={item.imgUrl} alt={item.title} className="h-44 w-full object-cover" />
              ) : (
                <div className="flex h-44 w-full items-center justify-center bg-gradient-to-br from-aurora-500/15 to-purple-700/10 text-aurora-400">
                  <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M4.5 19.5h15a2.25 2.25 0 002.25-2.25V8.25A2.25 2.25 0 0019.5 6h-15A2.25 2.25 0 002.25 8.25v9A2.25 2.25 0 004.5 19.5z" />
                  </svg>
                </div>
              )}
              <figcaption className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-[13px] font-bold text-ink">{item.title}</span>
                {canManage && (
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteGalleryItem(item.id);
                      reload();
                    }}
                    className="text-[11px] font-bold text-ink3 hover:text-error transition-colors"
                  >
                    حذف
                  </button>
                )}
              </figcaption>
            </figure>
          ))}
          {items.length === 0 && (
            <div className="glass aurora-border rounded-2xl p-8 text-center sm:col-span-2 lg:col-span-3">
              <p className="text-ink3">هنوز تصویری در گالری نیست</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}