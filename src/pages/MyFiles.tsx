import { useEffect, useState } from "react";
import { deleteEducationItem, listMyFiles, type EducationItem } from "../lib/api/education";
import { toFa } from "../utils/fa";

export default function MyFiles() {
  const [files, setFiles] = useState<EducationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = () =>
    listMyFiles()
      .then(setFiles)
      .catch(() => setFiles([]))
      .finally(() => setLoading(false));

  useEffect(() => {
    reload();
  }, []);

  return (
    <div className="space-y-6">
      <div className="glass aurora-border rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-ink mb-1">فایل‌های من</h2>
        <p className="text-sm text-ink2">
          جزوات و ویدیوهایی که شما در بخش آموزش بارگذاری کرده‌اید
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="glass aurora-border rounded-xl px-5 py-4">
              <div className="skel h-4 w-56" />
              <div className="skel mt-2 h-3 w-40" />
            </div>
          ))}
        </div>
      ) : files.length === 0 ? (
        <div className="glass aurora-border rounded-2xl p-10 text-center">
          <p className="text-ink3">
            هنوز فایلی بارگذاری نکرده‌اید. از بخش «آموزش و جزوات» فایل یا ویدیو آپلود کنید.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="glass aurora-border msg-in rounded-xl px-5 py-4 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    file.kind === "video"
                      ? "bg-pink-500/15 text-pink-400"
                      : "bg-aurora-500/15 text-aurora-400"
                  }`}
                >
                  {file.kind === "video" ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-bold text-ink">{file.name}</p>
                  <p className="text-[11.5px] text-ink3">
                    {file.sizeLabel} · {toFa(file.sizeBytes)} بایت
                  </p>
                </div>
              </div>

              {file.dataUrl ? (
                <a
                  href={file.dataUrl}
                  download={file.name}
                  className="press text-aurora-500 hover:text-aurora-600 transition-colors shrink-0"
                  aria-label="دانلود"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </a>
              ) : (
                <span className="text-[10px] font-bold text-ink3 shrink-0">در سرور</span>
              )}

              <button
                type="button"
                onClick={async () => {
                  await deleteEducationItem(file.id);
                  reload();
                }}
                className="press text-ink3 hover:text-error transition-colors shrink-0"
                aria-label="حذف"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}