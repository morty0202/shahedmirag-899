import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import VideoTile from "../../components/classroom/VideoTile";
import ControlBar from "../../components/classroom/ControlBar";
import Alert from "../../components/ui/Alert";
import SubmitButton from "../../components/ui/SubmitButton";
import { useClassroomSession } from "../../hooks/useClassroomSession";
import { qualityLabels } from "../../lib/realtime/media";
import { useAuth } from "../../auth/AuthContext";
import { roleLabels } from "../../lib/api";
import { toFa } from "../../utils/fa";

const connLabels: Record<string, string> = {
  connecting: "در حال برقراری اتصال...",
  connected: "متصل",
  reconnecting: "اتصال قطع شد — در حال اتصال مجدد...",
  disconnected: "ارتباط قطع شد",
  failed: "اتصال ناموفق بود",
};

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${toFa(String(m).padStart(2, "0"))}:${toFa(String(s).padStart(2, "0"))}`;
}

export default function ClassroomRoom() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state, session, error, needsTicket, submittingTicket, ticketError, submitTicket, retry } = useClassroomSession(roomCode ?? "");
  const [panel, setPanel] = useState<"chat" | "people" | null>("chat");
  const [chatText, setChatText] = useState("");
  const [announceText, setAnnounceText] = useState("");
  const [ticketPassword, setTicketPassword] = useState("");
  const [lastAnnouncement, setLastAnnouncement] = useState<{ text: string; key: number } | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state?.chat.length]);

  // show newest announcement as toast for 6s
  useEffect(() => {
    if (!state || state.announcements.length === 0) return;
    const latest = state.announcements[state.announcements.length - 1];
    setLastAnnouncement({ text: latest.text, key: Date.now() });
    const t = window.setTimeout(() => setLastAnnouncement(null), 6000);
    return () => window.clearTimeout(t);
  }, [state?.announcements.length]);

  // kicked out
  useEffect(() => {
    if (state?.kicked) {
      navigate("/classes", { state: { kicked: state.kicked } });
    }
  }, [state?.kicked, navigate]);

  const toggleFullscreen = async () => {
    const el = shellRef.current;
    if (!el) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await el.requestFullscreen();
  };

  const sendChat = () => {
    if (!chatText.trim() || !session) return;
    session.sendChat(chatText);
    setChatText("");
  };

  const sendImage = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/") || file.size > 500 * 1024) return;
    const reader = new FileReader();
    reader.onload = () => session?.sendChat("", reader.result as string);
    reader.readAsDataURL(file);
  };

  if (needsTicket) {
    return (
      <div className="mx-auto max-w-md py-10">
        <div className="glass anim-fade-up rounded-3xl p-7">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-aurora-500/15 text-aurora-500">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </span>
            <div>
              <p className="text-[14.5px] font-extrabold text-ink">اتصال امن به سرور کلاس</p>
              <p className="text-[11.5px] text-ink3">برای ورود به کلاس آنلاین، رمز عبور حساب خود را تأیید کنید</p>
            </div>
          </div>
          {ticketError && <Alert variant="error" className="mb-4">{ticketError}</Alert>}
          <input
            type="password"
            value={ticketPassword}
            onChange={(e) => setTicketPassword(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === "Enter" && ticketPassword) {
                const ok = await submitTicket(ticketPassword);
                if (ok) setTicketPassword("");
              }
            }}
            placeholder="رمز عبور"
            dir="ltr"
            className="h-11 w-full rounded-xl border border-line bg-card2/60 px-4 text-left text-[13.5px] text-ink outline-none focus:border-aurora-500/50"
          />
          <p className="mt-2 text-[10.5px] leading-5 text-ink3">
            کاربری: <span dir="ltr" className="font-bold">{user?.username}</span> — هویت شما فقط از طریق سرور تأیید می‌شود.
          </p>
          <div className="mt-4 flex gap-3">
            <SubmitButton
              type="button"
              loading={submittingTicket}
              onClick={async () => {
                const ok = await submitTicket(ticketPassword);
                if (ok) setTicketPassword("");
              }}
            >
              تأیید و ورود به کلاس
            </SubmitButton>
            <button
              type="button"
              onClick={() => navigate("/classes")}
              className="btn btn-ghost"
            >
              انصراف
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg py-10 text-center">
        <div className="glass rounded-3xl p-8">
          <p className="text-[14px] font-bold text-error">{error}</p>
          <div className="mt-5 flex justify-center gap-3">
            <button
              onClick={retry}
              className="btn btn-primary"
            >
              تلاش مجدد
            </button>
            <button
              onClick={() => navigate("/classes")}
              className="btn btn-ghost"
            >
              بازگشت به لیست کلاس‌ها
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <svg className="h-9 w-9 animate-spin text-aurora-400" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
          <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <p className="text-[13px] font-semibold text-ink3">در حال اتصال به کلاس...</p>
      </div>
    );
  }

  const remoteSharer = state.participants.find(
    (p) => p.screenOn && (p.stream?.getVideoTracks().length ?? 0) > 0,
  );
  const selfScreenStream = state.screenOn ? (session?.screenShareStream ?? null) : null;
  const stageStream: MediaStream | null = remoteSharer?.stream ?? selfScreenStream;
  const selfSharing = !remoteSharer && !!selfScreenStream;
  const stageLabel = remoteSharer ? `${remoteSharer.name} در حال اشتراک صفحه است` : "شما در حال اشتراک صفحه هستید";
  const qualityCls =
    state.myQuality.grade === "good"
      ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
      : state.myQuality.grade === "fair"
      ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
      : "text-error border-error/30 bg-error/10";

  return (
    <div ref={shellRef} className="anim-fade-up bg-page">
      {/* room header */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-3xl border border-line glass px-5 py-3.5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-aurora-500 to-aurora-700 text-white">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75h15m-15 0a8.25 8.25 0 0115 0m-15 0v1.5A2.25 2.25 0 006.75 16.5h10.5a2.25 2.25 0 002.25-2.25v-1.5" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-extrabold text-ink">
              کلاس آنلاین · کد {toFa(roomCode ?? "")}
            </p>
            <p className="text-[11px] text-ink3">
              {connLabels[state.connection] ?? state.connection} · {fmtTime(state.elapsedSec)}
              {state.transport === "local" && " · حالت توسعه محلی"}
            </p>
          </div>
        </div>

        <span className={`rounded-full border px-3 py-1 text-[11px] font-bold ${qualityCls}`}>
          {qualityLabels[state.myQuality.grade]}
        </span>
        {state.transport === "local" && (
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-500">
            حالت توسعه محلی
          </span>
        )}
        <span className="rounded-full border border-line bg-card2/60 px-3 py-1 text-[11px] font-bold text-ink2">
          {toFa(state.participants.length + 1)} شرکت‌کننده
        </span>
        <button
          type="button"
          onClick={toggleFullscreen}
          title="حالت تمام‌صفحه"
          aria-label="حالت تمام‌صفحه"
          className="press flex h-9 w-9 items-center justify-center rounded-xl border border-line text-ink2 transition-colors hover:text-aurora-500"
        >
          <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
          </svg>
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* camera-optional notice (hidden while sharing the screen) */}
        {!state.camAvailable && !state.screenOn && (
          <div className="mb-1 flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-[12px] font-bold text-amber-500">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25zM3 3l18 18" />
            </svg>
            دوربین در این دستگاه پیدا نشد؛ کلاس فقط با صدا برگزار می‌شود. (دوربین اختیاری است)
          </div>
        )}

        {/* video area */}
        <div className="space-y-4">
          {/* main stage: the shared screen takes the big box for EVERYONE (remote & self) */}
          {stageStream ? (
            <div className="relative overflow-hidden rounded-2xl border border-line bg-black/90 shadow-2xl">
              <ScreenView stream={stageStream} isSelf={selfSharing} />
              <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-xl bg-aurora-600/85 px-3 py-1.5 text-[11px] font-bold text-white shadow-lg">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-7.5 3.75h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v8.25a2.25 2.25 0 002.25 2.25z M2.25 12.75l5.25-3 5.25 3m-10.5 0v1.5A2.25 2.25 0 004.5 16.5h15a2.25 2.25 0 002.25-2.25v-1.5" />
                </svg>
                {stageLabel}
              </span>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {!state.screenOn && (
              <VideoTile stream={session?.localStream ?? null} name={`${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "من"} role={user?.role} micOn={state.micOn} isSelf quality={{ grade: state.myQuality.grade, loss: 0, rtt: 0 }} screenOn={false} />
            )}
            {state.participants
              .filter((p) => p !== remoteSharer)
              .map((p) => (
                <VideoTile key={p.peerId} stream={p.stream} name={p.name} role={p.role} micOn={p.micOn} handRaised={p.handRaised} quality={p.quality} />
              ))}
          </div>

          <ControlBar
            micOn={state.micOn}
            camOn={state.camOn}
            micAvailable={state.micAvailable}
            camAvailable={state.camAvailable}
            screenOn={state.screenOn}
            handRaised={state.handRaised}
            isHost={!!session?.isHost}
            onToggleMic={() => session?.toggleMic()}
            onToggleCam={() => session?.toggleCam()}
            onToggleScreen={() => void session?.setScreenShare(!state.screenOn).catch(() => undefined)}
            onToggleHand={() => session?.setHand(!state.handRaised)}
            onLeave={() => {
              session?.leave();
              navigate("/classes");
            }}
          />
          {!session?.isHost && !state.micAllowed && (
            <p className="flex items-center justify-center gap-1.5 text-center text-[11.5px] text-ink3">
              <span className="text-amber-400">✋</span>
              میکروفون شما فقط با اجازه معلم فعال می‌شود — ابتدا دکمه «دست بلند کردن» را بزنید
            </p>
          )}
        </div>

        {/* side panel */}
        {panel && (
          <aside className="glass msg-in flex max-h-[560px] flex-col rounded-3xl lg:max-h-none">
            {/* tabs */}
            <div className="flex border-b border-line">
              {(["chat", "people"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPanel(t)}
                  className={`flex-1 py-3 text-[12.5px] font-extrabold transition-colors ${
                    panel === t ? "border-b-2 border-aurora-500 text-aurora-500" : "text-ink3 hover:text-ink2"
                  }`}
                >
                  {t === "chat" ? `گفتگو (${toFa(state.chat.length)})` : `شرکت‌کنندگان (${toFa(state.participants.length + 1)})`}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPanel(null)}
                aria-label="بستن پنل"
                className="px-4 text-ink3 transition-colors hover:text-ink"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {panel === "chat" ? (
              <>
                {/* announcements banner (teacher compose) */}
                {session?.isHost && (
                  <div className="flex gap-2 border-b border-line p-3">
                    <input
                      value={announceText}
                      onChange={(e) => setAnnounceText(e.target.value)}
                      placeholder="اطلاعیه برای کلاس..."
                      className="h-9 flex-1 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 text-[12px] text-ink outline-none placeholder:text-ink3 focus:border-amber-500/60"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        session.announce(announceText);
                        setAnnounceText("");
                      }}
                      className="press rounded-xl bg-amber-500/20 px-3 text-[11.5px] font-extrabold text-amber-400"
                    >
                      ارسال
                    </button>
                  </div>
                )}

                <div className="no-scrollbar flex-1 space-y-3 overflow-y-auto p-4">
                  {state.chat.length === 0 && (
                    <p className="pt-8 text-center text-[12px] text-ink3">گفتگوی کلاس اینجاست؛ اولین پیام را بفرستید</p>
                  )}
                  {state.chat.map((c) => {
                    const mine = c.peerId === "self";
                    return (
                      <div key={c.id} className={`msg-in flex flex-col ${mine ? "items-end" : "items-start"}`}>
                        <span className="mb-1 text-[10px] font-bold text-ink3">
                          {c.name} · {toFa(new Date(c.ts).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" }))}
                        </span>
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[12.5px] leading-6 ${
                            mine
                              ? "rounded-br-md bg-gradient-to-br from-aurora-500 to-aurora-700 text-white"
                              : "rounded-bl-md border border-line bg-card2/70 text-ink2"
                          }`}
                        >
                          {c.image && <img src={c.image} alt="" className="mb-1.5 max-h-40 rounded-xl" />}
                          {c.text}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                {/* composer */}
                <div className="flex items-center gap-2 border-t border-line p-3">
                  <label className="press flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-line text-ink3 transition-colors hover:text-aurora-500" title="ارسال تصویر">
                    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M4.5 19.5h15a2.25 2.25 0 002.25-2.25V8.25A2.25 2.25 0 0019.5 6h-15A2.25 2.25 0 002.25 8.25v9A2.25 2.25 0 004.5 19.5z" />
                    </svg>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { sendImage(e.target.files?.[0]); e.target.value = ""; }} />
                  </label>
                  <input
                    value={chatText}
                    onChange={(e) => setChatText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendChat()}
                    placeholder="پیام خود را بنویسید..."
                    className="h-9 flex-1 rounded-xl border border-line bg-card2/60 px-3 text-[12.5px] text-ink outline-none placeholder:text-ink3 focus:border-aurora-500/50"
                  />
                  <button
                    type="button"
                    onClick={sendChat}
                    className="press flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-aurora-500 to-aurora-700 text-white"
                    aria-label="ارسال پیام"
                  >
                    <svg className="h-4 w-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  </button>
                </div>
              </>
            ) : (
              /* participants */
              <div className="no-scrollbar flex-1 space-y-2 overflow-y-auto p-3">
                {/* self */}
                <div className="flex items-center gap-3 rounded-xl border border-aurora-500/30 bg-aurora-500/8 px-3 py-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-aurora-400 to-aurora-700 text-[11px] font-black text-white">
                    {(user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-bold text-ink">شما</p>
                    <p className="text-[10.5px] text-ink3">{user && roleLabels[user.role]}</p>
                  </div>
                  {state.handRaised && <span className="text-[10px] font-bold text-amber-400">✋</span>}
                </div>

                {[...state.participants]
                  .sort((a, b) => Number(b.handRaised) - Number(a.handRaised))
                  .map((p) => (
                  <div key={p.peerId} className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${p.handRaised ? "border-amber-500/50 bg-amber-500/10" : "border-line hover:border-aurora-500/30"}`}>
                    <span className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-aurora-500/15 text-[11px] font-black text-aurora-400">
                      {p.name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("")}
                      {p.handRaised && (
                        <span className="pop-in absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[11px] shadow-lg" title="دست بلند کرده">✋</span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-bold text-ink">{p.name}</p>
                      <p className="text-[10.5px] text-ink3">
                        {roleLabels[p.role]} · {p.micOn ? "میکروفون روشن" : "بی‌صدا"}
                      </p>
                    </div>

                    {/* teacher controls */}
                    {session?.isHost && (
                      <>
                        {p.handRaised && !p.micOn ? (
                          /* grant speaking right — always visible while a hand is up */
                          <button
                            type="button"
                            onClick={() => session.setPeerPerm(p.peerId, "mic", true)}
                            title="اجازه صحبت دادن"
                            className="press flex h-8 shrink-0 items-center gap-1 rounded-lg bg-amber-400/90 px-2.5 text-[11px] font-black text-black shadow-md transition-transform hover:scale-105"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                            </svg>
                            اجازه صحبت
                          </button>
                        ) : (
                          <div className="flex shrink-0 gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                            {p.micOn && (
                              <button
                                type="button"
                                onClick={() => session.setPeerPerm(p.peerId, "mic", false)}
                                title="لغو اجازه صحبت"
                                className="press flex h-7 w-7 items-center justify-center rounded-lg border border-line text-ink3 hover:border-amber-500/40 hover:text-amber-400"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3zM3 3l18 18" />
                                </svg>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => session.kick(p.peerId)}
                              title="حذف از کلاس"
                              className="press flex h-7 w-7 items-center justify-center rounded-lg border border-line text-ink3 hover:border-error/40 hover:text-error"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>

      {/* announcement toast */}
      {lastAnnouncement && (
        <div key={lastAnnouncement.key} className="pop-in fixed bottom-6 right-6 z-50 max-w-xs rounded-2xl border border-amber-500/40 bg-amber-500/15 px-4 py-3 backdrop-blur-md">
          <p className="mb-0.5 flex items-center gap-1.5 text-[11px] font-black text-amber-400">
            اطلاعیه معلم
          </p>
          <p className="text-[12.5px] leading-6 text-ink2">{lastAnnouncement.text}</p>
        </div>
      )}
    </div>
  );
}

/** Full-stage video element for screen shares (remote or self). */
function ScreenView({ stream, isSelf }: { stream: MediaStream | null; isSelf?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (el && el.srcObject !== stream) el.srcObject = stream;
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
  return (
    <>
      <video ref={ref} autoPlay playsInline className="mx-auto max-h-[70vh] w-full object-contain" />
      {audioBlocked && (
        <button
          type="button"
          onClick={() => {
            const el = ref.current;
            if (!el) return;
            el.muted = false;
            void el.play().then(() => setAudioBlocked(false)).catch(() => undefined);
          }}
          className="absolute inset-0 z-10 flex items-center justify-center"
        >
          <span className="rounded-xl bg-white/90 px-4 py-2 text-[12.5px] font-extrabold text-gray-900 shadow-xl">
            🔊 برای شنیدن صدای صفحه کلیک کنید
          </span>
        </button>
      )}
    </>
  );
}
