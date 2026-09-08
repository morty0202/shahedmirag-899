interface Props {
  micOn: boolean;
  camOn: boolean;
  micAvailable: boolean;
  camAvailable: boolean;
  screenOn: boolean;
  handRaised: boolean;
  isHost: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleScreen: () => void;
  onToggleHand: () => void;
  onLeave: () => void;
}

export default function ControlBar(p: Props) {
  const icon = (d: string) => (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );

  return (
    <div className="glass-strong flex items-center justify-center gap-2 rounded-3xl px-4 py-3 md:gap-3">
      <button
        type="button"
        title={p.micOn ? "خاموش کردن میکروفون" : "روشن کردن میکروفون"}
        aria-label={p.micOn ? "خاموش کردن میکروفون" : "روشن کردن میکروفون"}
        onClick={p.onToggleMic}
        disabled={!p.micAvailable}
        className={`btn btn-icon ${p.micOn ? "btn-active" : ""} ${
          p.micAvailable ? "" : "opacity-40"
        }`}
      >
        {icon(
          p.micOn
            ? "M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
            : "M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3zM3 3l18 18"
        )}
      </button>

      <button
        type="button"
        title={p.camAvailable ? (p.camOn ? "خاموش کردن دوربین" : "روشن کردن دوربین") : "دوربین در دسترس نیست"}
        aria-label={p.camAvailable ? (p.camOn ? "خاموش کردن دوربین" : "روشن کردن دوربین") : "دوربین در دسترس نیست"}
        onClick={p.onToggleCam}
        disabled={!p.camAvailable}
        className={`btn btn-icon ${p.camOn ? "btn-active" : ""} ${
          p.camAvailable ? "" : "opacity-40"
        }`}
      >
        {icon(
          p.camOn
            ? "M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
            : "M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25zM3 3l18 18"
        )}
      </button>

      <button
        type="button"
        title={p.screenOn ? "قطع اشتراک صفحه" : "اشتراک صفحه"}
        aria-label={p.screenOn ? "قطع اشتراک صفحه" : "اشتراک صفحه"}
        onClick={p.onToggleScreen}
        className={`btn btn-icon ${p.screenOn ? "btn-active" : ""}`}
      >
        {icon("M3 8.689c0-.864.933-1.405 1.683-.977l7.108 4.061a1.125 1.125 0 010 1.953l-7.108 4.061A1.125 1.125 0 013 16.81V8.69zM12.75 8.689c0-.864.933-1.405 1.683-.977l7.108 4.061a1.125 1.125 0 010 1.953l-7.108 4.061a1.125 1.125 0 01-1.683-.977V8.69z")}
      </button>

      <button
        type="button"
        title={p.handRaised ? "پایین آوردن دست" : "اجازه صحبت (بلند کردن دست)"}
        aria-label={p.handRaised ? "پایین آوردن دست" : "بلند کردن دست"}
        onClick={p.onToggleHand}
        className={`btn btn-icon ${p.handRaised ? "btn-active" : ""}`}
      >
        {icon("M10.05 4.575a1.575 1.575 0 10-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 013.15 0v1.5m-3.15 0l.075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 013.15 0V15M6.9 7.575a1.575 1.575 0 10-3.15 0v8.175a6.75 6.75 0 006.75 6.75h2.018a5.25 5.25 0 003.712-1.538l1.732-1.732a5.25 5.25 0 001.538-3.712l.003-2.024a.668.668 0 01.198-.471 1.575 1.575 0 10-2.228-2.228 3.818 3.818 0 00-1.12 2.687M6.9 7.575V12m6.27 4.318A4.49 4.49 0 0116.35 15m.002 0h-.002")}
      </button>

      <button
        type="button"
        onClick={p.onLeave}
        className="btn btn-danger-solid gap-2 px-5"
      >
        <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
        </svg>
        ترک کلاس
      </button>
    </div>
  );
}
