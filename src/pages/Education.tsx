import { useState, useCallback, useEffect, type DragEvent } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  deleteEducationItem,
  listEducationItems,
  uploadEducationItem,
  type EducationItem,
} from "../lib/api/education";
import { emitNotificationsRefresh } from "../lib/events";

/* jewel-tone tokens per grade — bar / glow / luminous number tile */
const grades = [
  {
    id: "10",
    title: "دهم",
    subtitle: "پایه دهم متوسطه",
    icon: "۱۰",
    bar: "from-sky-400 via-blue-500 to-indigo-600",
    ambient: "bg-blue-500/20",
    tileBg: "from-blue-500/30 to-blue-700/10",
    tileRing: "border-blue-400/30",
    numText: "text-blue-100",
    numShadow: "shadow-[0_14px_40px_-12px_rgba(59,130,246,0.65)]",
    hoverBorder: "hover:border-blue-400/40",
    hoverShadow: "hover:shadow-[0_24px_60px_-24px_rgba(59,130,246,0.55)]",
    accentText: "text-blue-300",
  },
  {
    id: "11",
    title: "یازدهم",
    subtitle: "پایه یازدهم متوسطه",
    icon: "۱۱",
    bar: "from-fuchsia-400 via-purple-500 to-purple-700",
    ambient: "bg-purple-500/20",
    tileBg: "from-fuchsia-500/25 to-purple-700/15",
    tileRing: "border-purple-400/30",
    numText: "text-purple-100",
    numShadow: "shadow-[0_14px_40px_-12px_rgba(168,85,247,0.65)]",
    hoverBorder: "hover:border-purple-400/40",
    hoverShadow: "hover:shadow-[0_24px_60px_-24px_rgba(168,85,247,0.55)]",
    accentText: "text-purple-300",
  },
  {
    id: "12",
    title: "دوازدهم",
    subtitle: "پایه دوازدهم متوسطه",
    icon: "۱۲",
    bar: "from-emerald-400 via-teal-500 to-teal-700",
    ambient: "bg-emerald-500/20",
    tileBg: "from-emerald-500/30 to-teal-700/10",
    tileRing: "border-emerald-400/30",
    numText: "text-emerald-100",
    numShadow: "shadow-[0_14px_40px_-12px_rgba(16,185,129,0.65)]",
    hoverBorder: "hover:border-emerald-400/40",
    hoverShadow: "hover:shadow-[0_24px_60px_-24px_rgba(16,185,129,0.55)]",
    accentText: "text-emerald-300",
  },
];

const classrooms: Record<string, { id: string; title: string; teacher: string }[]> = {
  "10": [
    { id: "math-10", title: "ریاضی", teacher: "استاد احمدی" },
    { id: "physics-10", title: "فیزیک", teacher: "استاد رضایی" },
    { id: "chemistry-10", title: "شیمی", teacher: "استاد محمدی" },
    { id: "biology-10", title: "زیست‌شناسی", teacher: "استاد حسینی" },
    { id: "arabic-10", title: "عربی", teacher: "استاد کریمی" },
    { id: "persian-10", title: "فارسی", teacher: "استاد نوری" },
    { id: "english-10", title: "زبان انگلیسی", teacher: "استاد علیزاده" },
    { id: "religion-10", title: "دین و زندگی", teacher: "استاد صادقی" },
  ],
  "11": [
    { id: "math-11", title: "ریاضی", teacher: "استاد احمدی" },
    { id: "physics-11", title: "فیزیک", teacher: "استاد رضایی" },
    { id: "chemistry-11", title: "شیمی", teacher: "استاد محمدی" },
    { id: "biology-11", title: "زیست‌شناسی", teacher: "استاد حسینی" },
    { id: "arabic-11", title: "عربی", teacher: "استاد کریمی" },
    { id: "persian-11", title: "فارسی", teacher: "استاد نوری" },
    { id: "english-11", title: "زبان انگلیسی", teacher: "استاد علیزاده" },
    { id: "religion-11", title: "دین و زندگی", teacher: "استاد صادقی" },
  ],
  "12": [
    { id: "math-12", title: "ریاضی", teacher: "استاد احمدی" },
    { id: "physics-12", title: "فیزیک", teacher: "استاد رضایی" },
    { id: "chemistry-12", title: "شیمی", teacher: "استاد محمدی" },
    { id: "biology-12", title: "زیست‌شناسی", teacher: "استاد حسینی" },
    { id: "arabic-12", title: "عربی", teacher: "استاد کریمی" },
    { id: "persian-12", title: "فارسی", teacher: "استاد نوری" },
    { id: "english-12", title: "زبان انگلیسی", teacher: "استاد علیزاده" },
    { id: "religion-12", title: "دین و زندگی", teacher: "استاد صادقی" },
  ],
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " بایت";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " کیلوبایت";
  return (bytes / 1048576).toFixed(1) + " مگابایت";
}

function ClassroomView({ gradeId, classroomId }: { gradeId: string; classroomId: string }) {
  const { user } = useAuth();
  const [files, setFiles] = useState<EducationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const canUpload = user?.role === "teacher" || user?.role === "admin";

  const reload = useCallback(() => {
    setLoading(true);
    listEducationItems(gradeId, classroomId)
      .then(setFiles)
      .catch(() => setFiles([]))
      .finally(() => setLoading(false));
  }, [gradeId, classroomId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const classroom = classrooms[gradeId]?.find((c) => c.id === classroomId);
  const grade = grades.find((g) => g.id === gradeId);

  const doUpload = useCallback(
    async (selected: File[]) => {
      if (selected.length === 0 || !canUpload) return;
      setUploading(true);
      setUploadError(null);
      for (const f of selected) {
        try {
          const dataUrl: string = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error("read_error"));
            reader.readAsDataURL(f);
          });
          await uploadEducationItem({
            gradeId,
            classroomId,
            title: f.name,
            kind: f.type.startsWith("video") ? "video" : "file",
            name: f.name,
            sizeLabel: formatFileSize(f.size),
            sizeBytes: f.size,
            mime: f.type || "application/octet-stream",
            dataUrl,
          });
        } catch {
          setUploadError("آپلود یکی از فایلها با خطا مواجه شد");
        }
      }
      setUploading(false);
      reload();
      emitNotificationsRefresh();
    },
    [gradeId, classroomId, canUpload, reload]
  );

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      if (canUpload) void doUpload(Array.from(e.dataTransfer.files));
    },
    [canUpload, doUpload]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files || []);
      e.target.value = "";
      if (canUpload) void doUpload(selected);
    },
    [canUpload, doUpload]
  );

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteEducationItem(id);
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch {
      /* ignore */
    }
  }, []);

  if (!classroom || !grade) {
    return (
      <div className="text-center py-16">
        <p className="text-ink2 text-lg">صفحه مورد نظر یافت نشد</p>
        <Link to="/education" className="text-aurora-500 hover:text-ink2 mt-4 inline-block">
          بازگشت به آموزش و جزوات
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-ink3">
        <Link to="/education" className="hover:text-ink2 transition-colors">
          آموزش و جزوات
        </Link>
        <span>/</span>
        <Link to={`/education/${gradeId}`} className="hover:text-ink2 transition-colors">
          {grade.title}
        </Link>
        <span>/</span>
        <span className="text-ink">{classroom.title}</span>
      </nav>

      {/* Header */}
      <div className="glass aurora-border rounded-2xl p-6">
        <h2 className="text-xl font-bold text-ink mb-1">{classroom.title}</h2>
        <p className="text-sm text-ink2">
          پایه {grade.title} · {classroom.teacher}
        </p>
      </div>

      {/* Upload Zone — معلم/مدیر */}
      {canUpload && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`upload-zone rounded-2xl p-8 text-center cursor-pointer ${
            isDragOver ? "drag-over" : ""
          }`}
        >
          <svg
            className="w-12 h-12 mx-auto text-aurora-400/50 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
          <p className="text-ink font-medium mb-1">
            {uploading ? "در حال آپلود فایل‌ها..." : "فایل یا ویدیو خود را اینجا رها کنید"}
          </p>
          <p className="text-sm text-ink3 mb-4">یا از گزینه زیر انتخاب کنید</p>
          <label className="btn btn-secondary btn-sm cursor-pointer im-upload">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            انتخاب فایل
            <input
              type="file"
              multiple
              disabled={uploading}
              accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.mkv,.avi,.jpg,.png"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
          {uploadError && <p className="mt-3 text-xs font-bold text-error">{uploadError}</p>}
        </div>
      )}

      {/* File List */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-ink">فایل‌های آپلود شده</h3>
        {loading ? (
          <div className="glass aurora-border rounded-xl p-8 text-center">
            <div className="skel mx-auto h-4 w-40" />
          </div>
        ) : files.length === 0 ? (
          <div className="glass aurora-border rounded-xl p-8 text-center">
            <p className="text-ink3">هنوز فایلی آپلود نشده است</p>
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
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      file.kind === "video"
                        ? "bg-pink-500/15 text-pink-400"
                        : "bg-aurora-500/15 text-aurora-400"
                    }`}
                  >
                    {file.kind === "video" ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink truncate">{file.name}</p>
                    <p className="text-xs text-ink3">
                      {file.sizeLabel} · {file.uploaderName}
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
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                  </a>
                ) : (
                  <span className="text-[10px] font-bold text-ink3 shrink-0">در سرور</span>
                )}

                {(canUpload || file.uploaderId === user?.id) && (
                  <button
                    onClick={() => void handleDelete(file.id)}
                    className="press text-ink3 hover:text-error transition-colors shrink-0"
                    aria-label="حذف فایل"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Education() {
  const { grade, classroom } = useParams<{ grade: string; classroom: string }>();

  if (grade && classroom) {
    return <ClassroomView gradeId={grade} classroomId={classroom} />;
  }

  if (grade) {
    const gradeInfo = grades.find((g) => g.id === grade);
    const gradeClassrooms = classrooms[grade];

    if (!gradeInfo || !gradeClassrooms) {
      return (
        <div className="text-center py-16">
          <p className="text-ink2 text-lg">پایه مورد نظر یافت نشد</p>
          <Link to="/education" className="text-aurora-500 hover:text-ink2 mt-4 inline-block">
            بازگشت به آموزش و جزوات
          </Link>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <nav className="flex items-center gap-2 text-sm text-ink3">
          <Link to="/education" className="hover:text-ink2 transition-colors">
            آموزش و جزوات
          </Link>
          <span>/</span>
          <span className="text-ink">{gradeInfo.title}</span>
        </nav>

        <div className="glass aurora-border rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-ink mb-1">پایه {gradeInfo.title}</h2>
          <p className="text-sm text-ink2">{gradeInfo.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {gradeClassrooms.map((cls) => (
            <Link
              key={cls.id}
              to={`/education/${grade}/${cls.id}`}
              className="card-hover glass aurora-border aurora-border-hover rounded-xl p-5 group"
            >
              <h3 className="text-base font-bold text-ink mb-1 group-hover:text-ink2 transition-colors">
                {cls.title}
              </h3>
              <div className="mt-3 flex items-center gap-1 text-xs text-aurora-500/70 group-hover:text-aurora-500 transition-colors">
                <span>مشاهده فایل‌ها</span>
                <svg className="w-3.5 h-3.5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // Grade Selection View
  return (
    <div className="space-y-6">
      <div className="glass aurora-border rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-ink mb-1">آموزش و جزوات</h2>
        <p className="text-sm text-ink2">
          پایه تحصیلی خود را انتخاب کنید تا به جزوات و ویدیوهای آموزشی دسترسی پیدا کنید
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {grades.map((g, i) => (
          <Link
            key={g.id}
            to={`/education/${g.id}`}
            className={`anim-fade-up group relative overflow-hidden rounded-[26px] border border-white/10 bg-gradient-to-b from-[#191922] to-[#0f0f14] p-7 pt-8 text-center transition-all duration-300 hover:-translate-y-1.5 ${g.hoverBorder} ${g.hoverShadow}`}
            style={{ animationDelay: `${120 + i * 90}ms` }}
          >
            {/* top edge accent bar */}
            <span
              className={`absolute inset-x-6 top-0 h-[3px] rounded-b-full bg-gradient-to-l ${g.bar} transition-all duration-300 group-hover:inset-x-4 group-hover:shadow-[0_2px_16px_rgba(255,255,255,0.25)]`}
              aria-hidden="true"
            />
            {/* ambient colored glow */}
            <span
              className={`pointer-events-none absolute -top-16 right-1/2 h-44 w-44 translate-x-1/2 rounded-full ${g.ambient} opacity-60 blur-3xl transition-opacity duration-500 group-hover:opacity-100`}
              aria-hidden="true"
            />

            {/* luminous number tile */}
            <span
              className={`relative mx-auto flex h-[68px] w-[68px] items-center justify-center rounded-[22px] border ${g.tileRing} bg-gradient-to-br ${g.tileBg} text-[26px] font-black ${g.numText} ${g.numShadow} backdrop-blur-sm transition-transform duration-300 group-hover:scale-[1.06]`}
            >
              {g.icon}
            </span>

            <h3 className="relative mt-5 text-[21px] font-black text-white">{g.title}</h3>
            <p className="relative mt-1 text-[12px] font-medium text-white/55">{g.subtitle}</p>

            {/* lesson count chip */}
            <span className="relative mt-5 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-1.5 text-[11.5px] font-bold text-white/70 transition-colors duration-300 group-hover:bg-white/[0.1] group-hover:text-white/85">
              <svg className={`h-3.5 w-3.5 ${g.accentText}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 6.5h13M5.5 10.5h13M5.5 14.5h8" />
              </svg>
              {classrooms[g.id]?.length || 0} درس
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
