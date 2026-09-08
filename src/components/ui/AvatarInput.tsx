import { useRef } from "react";

interface Props {
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
  size?: number;
}

/** Profile photo picker with instant preview; downscales to 256px for storage. */
export default function AvatarInput({ value, onChange, size = 88 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fallback = value ? (
    <img src={value} alt="تصویر پروفایل" className="h-full w-full object-cover" />
  ) : (
    <svg className="h-9 w-9 text-aurora-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );

  const pick = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 3 * 1024 * 1024) return; // guard; canvas handles the rest

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // downscale to 256×256 cover crop
        const canvas = document.createElement("canvas");
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const side = Math.min(img.width, img.height);
        ctx.drawImage(
          img,
          (img.width - side) / 2,
          (img.height - side) / 2,
          side,
          side,
          0,
          0,
          256,
          256
        );
        onChange(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex items-center gap-4">
      <div className="group relative shrink-0" style={{ width: size, height: size }}>
        <div className="h-full w-full overflow-hidden rounded-3xl border border-line bg-aurora-500/10 flex items-center justify-center">
          {fallback}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label="انتخاب تصویر پروفایل"
          className="press absolute inset-0 flex items-center justify-center rounded-3xl bg-black/45 text-white opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
          </svg>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      <div>
        <p className="text-[12.5px] font-bold text-ink">تصویر پروفایل</p>
        <p className="mt-0.5 text-[11px] text-ink3">حداکثر ۳ مگابایت — به‌صورت خودکار بهینه می‌شود</p>
        {value && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="press mt-1.5 text-[11px] font-bold text-error transition-opacity hover:opacity-75"
          >
            حذف تصویر
          </button>
        )}
      </div>
    </div>
  );
}
