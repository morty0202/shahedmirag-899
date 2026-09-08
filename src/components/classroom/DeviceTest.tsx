import { useEffect, useRef, useState } from "react";
import { acquireLocalStream, mediaErrorToFa, stopStream } from "../../lib/realtime/media";

/** Helper: is the page served from a secure context that allows getUserMedia? */
function isSecureContextHint(): boolean {
  return !window.isSecureContext;
}

/** Pre-join camera/mic test with live level meter. */
export default function DeviceTest() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<"idle" | "requesting" | "ready" | "denied">("idle");
  const [error, setError] = useState<string>("");
  const [level, setLevel] = useState(0);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [camAvailable, setCamAvailable] = useState(true);

  const start = async () => {
    setStatus("requesting");
    setError("");
    try {
      const media = await acquireLocalStream(true, true);
      const stream = media.stream;
      streamRef.current = stream;
      setCamAvailable(media.video);
      if (videoRef.current) videoRef.current.srcObject = stream;
      setStatus("ready");

      // mic level meter
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setLevel(Math.min(100, avg * 1.6));
        requestAnimationFrame(tick);
      };
      tick();
    } catch (err) {
      setStatus("denied");
      setError(err instanceof Error ? err.message : mediaErrorToFa(err));
    }
  };

  useEffect(() => {
    return () => {
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, []);

  const toggleCam = () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCamOn(track.enabled);
  };

  const toggleMic = () => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  };

  return (
    <div className="glass rounded-3xl p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </span>
        <div>
          <p className="text-[14px] font-extrabold text-ink">تست پیش از ورود</p>
          <p className="text-[11.5px] text-ink3">دوربین و میکروفون خود را قبل از ورود به کلاس آزمایش کنید</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1.2fr_1fr]">
        {/* preview */}
        <div className="relative aspect-video overflow-hidden rounded-2xl border border-line bg-surface-900">
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
          {status !== "ready" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
              {status === "denied" ? (
                <>
                  <p className="px-6 text-[12px] leading-6 text-error">{error}</p>
                  {isSecureContextHint() && (
                    <p className="px-6 text-[11px] leading-5 text-amber-400">
                      هشدار: صفحه در آدرس امن (https/localhost) باز نیست؛ مرورگر اجازه دوربین را در این حالت نمی‌دهد.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={start}
                    className="press rounded-xl border border-aurora-500/40 bg-aurora-500/10 px-4 py-2 text-[12px] font-extrabold text-aurora-500 transition-colors hover:bg-aurora-500/20"
                  >
                    تلاش مجدد
                  </button>
                </>
              ) : (
                <>
                  <p className="text-[12px] text-ink3">
                    {status === "requesting" ? "در حال دریافت دسترسی..." : "برای شروع آزمایش، دکمه زیر را بزنید"}
                  </p>
                  {status === "idle" && (
                    <button
                      type="button"
                      onClick={start}
                      className="press rounded-xl bg-gradient-to-br from-aurora-500 to-aurora-700 px-5 py-2.5 text-[12.5px] font-extrabold text-white shadow-lg shadow-aurora-600/25"
                    >
                      شروع تست دستگاه
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* meters + toggles */}
        <div className="flex flex-col justify-between gap-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[11.5px] font-bold">
              <span className="text-ink2">صدای میکروفون</span>
              <span className={micOn ? "text-emerald-500" : "text-error"}>{micOn ? "فعال" : "خاموش"}</span>
            </div>
            <div className="flex h-3 gap-1 overflow-hidden rounded-full">
              {Array.from({ length: 14 }, (_, i) => (
                <span
                  key={i}
                  className={`h-full flex-1 rounded-full transition-colors duration-100 ${
                    level > (i + 1) * 7 ? (i > 10 ? "bg-error" : i > 7 ? "bg-amber-400" : "bg-emerald-500") : "bg-line"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={toggleCam}
              disabled={status !== "ready" || !camAvailable}
              title={camAvailable ? undefined : "دوربین در دسترس نیست"}
              className={`press flex h-10 items-center justify-center gap-2 rounded-xl border text-[12px] font-bold transition-colors disabled:opacity-40 ${
                camOn ? "border-aurora-500/40 bg-aurora-500/15 text-aurora-500" : "border-line text-ink3"
              }`}
            >
              دوربین {camAvailable ? (camOn ? "روشن" : "خاموش") : "—"}
            </button>
            <button
              type="button"
              onClick={toggleMic}
              disabled={status !== "ready"}
              className={`press flex h-10 items-center justify-center gap-2 rounded-xl border text-[12px] font-bold transition-colors disabled:opacity-40 ${
                micOn ? "border-aurora-500/40 bg-aurora-500/15 text-aurora-500" : "border-line text-ink3"
              }`}
            >
              میکروفون {micOn ? "روشن" : "خاموش"}
            </button>
          </div>

          <p className="rounded-xl border border-line bg-aurora-500/5 px-3.5 py-2.5 text-[11px] leading-5 text-ink3">
            {status === "ready"
              ? camAvailable
                ? "✓ دستگاه‌ها آماده‌اند؛ می‌توانید با خیال راحت وارد کلاس شوید."
                : "✓ میکروفون فعال است؛ دوربین در این دستگاه پیدا نشد — کلاس فقط با صدا ادامه خواهد یافت."
              : "تست اختیاری است، اما برای تجربه بهتر کلاس توصیه می‌شود."}
          </p>
        </div>
      </div>

      {status === "denied" && (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[11.5px] leading-6 text-ink2">
          <p className="mb-1 text-[12px] font-extrabold text-amber-400">چگونه اجازه دسترسی بدهم؟</p>
          <ol className="list-decimal pr-4 space-y-1">
            <li>روی آیکن دوربین در نوار آدرس مرورگر (سمت چپ آدرس) کلیک کنید.</li>
            <li>گزینه «اجازه دادن برای این سایت» را برای دوربین و میکروفون انتخاب کنید.</li>
            <li>صفحه را رفرش کنید و دکمه «تلاش مجدد» را بزنید.</li>
          </ol>
        </div>
      )}
    </div>
  );
}
