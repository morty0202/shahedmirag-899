import { useEffect, useRef, useState } from "react";
import type { MediaQuality } from "../../lib/realtime/media";
import { roleLabels } from "../../lib/api";

interface Props {
  stream: MediaStream | null;
  name: string;
  role?: "student" | "teacher" | "admin";
  micOn?: boolean;
  handRaised?: boolean;
  screenOn?: boolean;
  quality?: MediaQuality;
  isSelf?: boolean;
  big?: boolean;
}

const qualityDot: Record<MediaQuality["grade"], string> = {
  good: "bg-emerald-500",
  fair: "bg-amber-400",
  poor: "bg-error",
};

export default function VideoTile({
  stream,
  name,
  role,
  micOn = true,
  handRaised,
  screenOn,
  quality,
  isSelf,
  big,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (el && el.srcObject !== stream) {
      el.srcObject = stream;
    }
    // Chrome autoplay policy may block remote audio playback — fall back to a
    // muted autoplay plus a click-to-unmute overlay instead of losing sound
    if (el && stream && !isSelf) {
      el.play()
        .then(() => setAudioBlocked(false))
        .catch(() => {
          el.muted = true;
          el.play()
            .then(() => setAudioBlocked(true))
            .catch(() => undefined);
        });
    }
  }, [stream, isSelf]);

  const unblockAudio = () => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = false;
    void el.play().then(() => setAudioBlocked(false)).catch(() => undefined);
  };

  const initials = name.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("");

  return (
    <div
      className={`msg-in group relative overflow-hidden rounded-2xl border border-line bg-surface-900/80 ${
        big ? "col-span-full aspect-video lg:col-span-2" : "aspect-video"
      }`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isSelf}
        className={`h-full w-full ${screenOn ? "object-contain" : "object-cover"}`}
      />

      {/* autoplay blocked the sound — one tap restores it */}
      {audioBlocked && (
        <button
          type="button"
          onClick={unblockAudio}
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/45 backdrop-blur-[2px]"
        >
          <span className="flex items-center gap-2 rounded-xl bg-white/90 px-4 py-2 text-[12.5px] font-extrabold text-gray-900 shadow-xl">
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5V8.25a2.25 2.25 0 00-2.25-2.25H15l-1.5-1.5h-3L9 6H6.75A2.25 2.25 0 004.5 8.25v7.5A2.25 2.25 0 006.75 18h10.5a2.25 2.25 0 002.25-2.25V13.5M18.75 12l2.25-2.25M18.75 12l-2.25-2.25" />
            </svg>
            برای شنیدن صدا کلیک کنید
          </span>
        </button>
      )}

      {/* no-camera fallback */}
      {(!stream || !stream.getVideoTracks().some((t) => t.enabled)) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-aurora-950 to-surface-900">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-aurora-500/15 text-lg font-black text-aurora-300">
            {initials}
          </span>
        </div>
      )}

      {/* name bar */}
      <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 rounded-xl bg-black/45 px-3 py-1.5 backdrop-blur-sm">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[12px] font-bold text-white">
            {name}
            {isSelf && " (شما)"}
          </span>
          {role && role !== "student" && (
            <span className="shrink-0 rounded-full bg-aurora-500/30 px-2 py-0.5 text-[9.5px] font-bold text-aurora-200">
              {roleLabels[role]}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {/* mic state */}
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-lg ${
              micOn ? "bg-emerald-500/25 text-emerald-300" : "bg-error/25 text-rose-300"
            }`}
            title={micOn ? "میکروفون روشن" : "میکروفون خاموش"}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {micOn ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z M3 3l18 18" />
              )}
            </svg>
          </span>
          {quality && (
            <span className={`h-2 w-2 rounded-full ${qualityDot[quality.grade]}`} title={`کیفیت: ${quality.grade}`} />
          )}
        </div>
      </div>

      {/* raised hand */}
      {handRaised && (
        <span className="pop-in absolute left-2 top-2 flex h-9 w-9 animate-bounce items-center justify-center rounded-xl bg-amber-400/90 text-white shadow-lg">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.05 4.575a1.575 1.575 0 10-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 013.15 0v1.5m-3.15 0l.075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 013.15 0V15M6.9 7.575a1.575 1.575 0 10-3.15 0v8.175a6.75 6.75 0 006.75 6.75h2.018a5.25 5.25 0 003.712-1.538l1.732-1.732a5.25 5.25 0 001.538-3.712l.003-2.024a.668.668 0 01.198-.471 1.575 1.575 0 10-2.228-2.228 3.818 3.818 0 00-1.12 2.687M6.9 7.575V12m6.27 4.318A4.49 4.49 0 0116.35 15m.002 0h-.002" />
          </svg>
        </span>
      )}
    </div>
  );
}
