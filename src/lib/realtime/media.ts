/** Camera / microphone / screen acquisition + adaptive quality helpers. */

export interface MediaQuality {
  grade: "good" | "fair" | "poor";
  loss: number; // packet loss %
  rtt: number; // round-trip ms
}

/** Result of local media acquisition — partial results are OK (camera is optional). */
export interface AcquiredMedia {
  stream: MediaStream;
  video: boolean;
  audio: boolean;
}

const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 24, max: 30 },
};

function isSecureMediaContext(): boolean {
  return typeof window !== "undefined" && window.isSecureContext === true;
}

function errName(err: unknown): string {
  return err instanceof DOMException ? err.name : err instanceof Error ? err.name : "";
}

/**
 * Acquire camera and/or microphone. NEVER blocks the whole class when only
 * ONE kind is missing:
 *   1. requests both at once (single permission dialog),
 *   2. if that fails for a non-permission reason, requests microphone and
 *      camera SEPARATELY and merges whatever succeeded.
 * Returns AcquiredMedia so callers know exactly which kinds are live.
 */
export async function acquireLocalStream(
  withVideo: boolean,
  withAudio: boolean = true
): Promise<AcquiredMedia> {
  if (!isSecureMediaContext()) {
    throw new Error(
      "صفحه در بافت امن (https/localhost) باز نیست؛ مرورگر دسترسی به دوربین/میکروفون را مجاز نمی‌کند."
    );
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("مرورگر از getUserMedia پشتیبانی نمی‌کند.");
  }

  // 1) combined attempt — one permission dialog for both
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: withAudio ? AUDIO_CONSTRAINTS : false,
      video: withVideo ? VIDEO_CONSTRAINTS : false,
    });
    return {
      stream,
      video: stream.getVideoTracks().length > 0,
      audio: stream.getAudioTracks().length > 0,
    };
  } catch (err) {
    const name = errName(err);
    // permission / security errors are final — surface them immediately
    if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") {
      throw new Error(mediaErrorToFa(err, "both"));
    }
    // device / busy / etc. → degrade to split acquisition below
    console.warn("[media] combined getUserMedia failed:", name);
  }

  // 2) split acquisition — keep whichever kind actually works
  const stream = new MediaStream();
  const failures: string[] = [];

  const requestOne = async (kind: "camera" | "microphone") => {
    try {
      const s = await navigator.mediaDevices.getUserMedia(
        kind === "camera"
          ? { video: VIDEO_CONSTRAINTS, audio: false }
          : { audio: AUDIO_CONSTRAINTS, video: false }
      );
      s.getTracks().forEach((t) => stream.addTrack(t));
      return true;
    } catch (err) {
      failures.push(errName(err) || String(err));
      return false;
    }
  };

  if (withAudio) await requestOne("microphone");
  if (withVideo) await requestOne("camera");

  const video = stream.getVideoTracks().length > 0;
  const audio = stream.getAudioTracks().length > 0;

  // at least one kind works → partial success (e.g. microphone only)
  if (audio || video) {
    return { stream, video, audio };
  }

  // nothing worked — pick the most informative failure
  if (failures.some((f) => f === "NotFoundError" || f === "DevicesNotFoundError")) {
    throw new Error("دوربین یا میکروفونی روی دستگاه پیدا نشد. اتصال دستگاه را بررسی کنید.");
  }
  if (failures.some((f) => f === "NotReadableError" || f === "TrackStartError")) {
    throw new Error("دوربین یا میکروفون توسط برنامه دیگری استفاده می‌شود. آن را ببندید و دوباره تلاش کنید.");
  }
  throw new Error(
    failures.length >= 2
      ? "دسترسی به دوربین و میکروفون ممکن نشد؛ دربارهٔ دسترسی مرورگر مطمئن شوید."
      : mediaErrorToFa(new DOMException(failures[0] || "UnknownError"), "both")
  );
}

/** Browser permission/devices errors → human (Persian) message. */
export function mediaErrorToFa(err: unknown, _kind?: "camera" | "microphone" | "both"): string {
  const name = err instanceof DOMException ? err.name : "";
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "دسترسی به دوربین/میکروفون رد شده است. از نوار آدرس مرورگر اجازه دهید و دوباره تلاش کنید.";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "دوربین یا میکروفونی روی دستگاه پیدا نشد. اتصال دستگاه را بررسی کنید.";
    case "NotReadableError":
    case "TrackStartError":
      return "دوربین یا میکروفون توسط برنامه دیگری استفاده می‌شود. آن را ببندید و دوباره تلاش کنید.";
    case "SecurityError":
      return "مروگر اجازه دسترسی به دوربین را در این آدرس نمی‌دهد. لطفاً از آدرس https یا localhost استفاده کنید.";
    case "OverconstrainedError":
      return "دوربین متصل با تنظیمات درخواستی سازگار نیست.";
    case "AbortError":
      return "درخواست دسترسی لغو شد.";
    default:
      return "دریافت دسترسی به دوربین/میکروفون ممکن نشد؛ دوباره تلاش کنید.";
  }
}

/**
 * Best-effort read of the browser permission state for camera/mic.
 * Returns "granted" | "denied" | "prompt" | "unsupported".
 */
export async function mediaPermissionState(
  kind: "camera" | "microphone"
): Promise<"granted" | "denied" | "prompt" | "unsupported"> {
  try {
    const perm = kind === "camera" ? { name: "camera" as PermissionName } : { name: "microphone" as PermissionName };
    const status = await navigator.permissions.query(perm);
    return status.state;
  } catch {
    return "unsupported";
  }
}

export async function getScreenStream(): Promise<MediaStream> {
  // request system/tab audio together with video — without it, remote peers
  // see the shared screen but never hear the sound it plays
  try {
    return await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
  } catch {
    return navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
  }
}

export function stopStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((t) => t.stop());
}

/** Monitors one RTCPeerConnection; calls back every `intervalMs` with stats. */
export function watchConnectionQuality(
  pc: RTCPeerConnection,
  cb: (q: MediaQuality) => void,
  intervalMs = 3000
): () => void {
  const timer = window.setInterval(async () => {
    try {
      const stats = await pc.getStats();
      let loss = 0;
      let rtt = 0;
      stats.forEach((report) => {
        if (report.type === "inbound-rtp" && report.kind === "video") {
          const lost = report.packetsLost ?? 0;
          const received = report.packetsReceived ?? 0;
          if (received + lost > 0) loss = (lost / (received + lost)) * 100;
        }
        if (report.type === "candidate-pair" && report.state === "succeeded") {
          rtt = report.currentRoundTripTime ? report.currentRoundTripTime * 1000 : 0;
        }
      });
      const grade = loss > 8 || rtt > 450 ? "poor" : loss > 3 || rtt > 250 ? "fair" : "good";
      cb({ grade, loss, rtt });
    } catch {
      /* stats unavailable mid-renegotiation — skip this tick */
    }
  }, intervalMs);
  return () => window.clearInterval(timer);
}

/** Degrades outbound video resolution when the link is congested. */
export async function adaptSenderQuality(pc: RTCPeerConnection, quality: MediaQuality) {
  if (quality.grade === "good") return;
  try {
    for (const sender of pc.getSenders()) {
      if (sender.track?.kind !== "video") continue;
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      params.encodings[0].scaleResolutionDownBy = quality.grade === "poor" ? 2 : 1.5;
      await sender.setParameters(params);
    }
  } catch {
    /* browser may reject mid-call param changes — non-fatal */
  }
}

export const qualityLabels: Record<MediaQuality["grade"], string> = {
  good: "اتصال عالی",
  fair: "اتصال متوسط",
  poor: "اتصال ضعیف",
};
