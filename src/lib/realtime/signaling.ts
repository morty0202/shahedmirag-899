/**
 * Signaling layer.
 *
 * Production transport: WebSocketSignaling → the Node signaling server
 * (server/index.mjs). Works across machines/networks.
 *
 * BroadcastSignaling stays ONLY as an explicit local-development fallback
 * (same-browser tabs). It is never used silently in production builds.
 */

export type Role = "student" | "teacher" | "admin";

export interface PeerInfo {
  peerId: string;
  name: string;
  role: Role;
}

/* -------- classroom feature payloads (whiteboard / presentation / tools) -------- */

export type StageMode = "video" | "screen" | "board" | "pres";

export type WbTool =
  | "pen"
  | "marker"
  | "eraser"
  | "text"
  | "line"
  | "arrow"
  | "rect"
  | "ellipse"
  | "image";

export interface WbStroke {
  id: string;
  by: string;
  tool: WbTool;
  color: string;
  size: number;
  points: { x: number; y: number }[];
  text?: string;
  src?: string;
  page: number;
}

export type WbOp =
  | { kind: "snapshot"; strokes: WbStroke[]; page: number; pages: number; editable: boolean }
  | { kind: "add"; stroke: WbStroke }
  | { kind: "remove"; id: string }
  | { kind: "clear"; page: number }
  | { kind: "pages"; count: number }
  | { kind: "goto"; page: number }
  | { kind: "perm"; editable: boolean }
  | { kind: "sync-req" };

export interface PresState {
  open: boolean;
  name: string;
  kind: "pdf" | "image";
  data: string;
  page: number;
}

export interface PollState {
  q: string;
  opts: string[];
  votes: number[];
  open: boolean;
}

export type PresMsg =
  | { action: "open"; name: string; kind: "pdf" | "image"; data: string }
  | { action: "page"; page: number }
  | { action: "close" };

export type PollMsg =
  | { action: "start"; q: string; opts: string[] }
  | { action: "vote"; idx: number }
  | { action: "end" };

export type TimerMsg = { action: "start" | "pause" | "reset"; remaining?: number };

export type SignalMessage =
  | { type: "join"; from: PeerInfo }
  | { type: "welcome"; to: string; from: PeerInfo }
  | { type: "offer"; to: string; from: string; sdp: RTCSessionDescriptionInit }
  | { type: "answer"; to: string; from: string; sdp: RTCSessionDescriptionInit }
  | { type: "ice"; to: string; from: string; cand: RTCIceCandidateInit }
  | { type: "leave"; from: string }
  | { type: "chat"; from: string; name: string; role: Role; text: string; image?: string; ts: number }
  | { type: "hand"; from: string; raised: boolean }
  | { type: "screen"; from: string; on: boolean }
  | { type: "mute-request"; to: string }
  | { type: "kick"; to: string; reason?: string }
  | { type: "announce"; from: string; text: string }
  /* ---- new: permissions & room lifecycle ---- */
  | { type: "perm"; to: string; kind: "mic" | "cam"; allowed: boolean }
  | { type: "mute-all" }
  | { type: "lock"; locked: boolean }
  | { type: "end" }
  /* ---- new: shared teaching tools ---- */
  | { type: "stage"; mode: StageMode }
  | { type: "wb"; from?: string; to?: string; op: WbOp }
  | { type: "pres"; msg: PresMsg }
  | { type: "poll"; msg: PollMsg }
  | { type: "notes"; text: string }
  | { type: "timer"; msg: TimerMsg }
  | { type: "rec"; on: boolean }
  | { type: "question"; id: string; name: string; text: string; clear?: boolean }
  | { type: "reaction"; id: string; name: string; emoji: string }
  /** server-generated membership events (WS mode only) */
  | { type: "presence"; event: "join" | "leave"; peer: PeerInfo };

export type ConnectionState = "connecting" | "connected" | "reconnecting" | "disconnected" | "failed";

export interface SignalingChannel {
  readonly selfId: string;
  readonly transport: "websocket" | "local";
  send(msg: SignalMessage): void;
  onMessage(cb: (msg: SignalMessage) => void): () => void;
  onState(cb: (state: ConnectionState) => void): () => void;
  /** ICE servers distributed by the signaling server (WS mode). */
  readonly iceServers: RTCIceServer[];
  close(): void;
}

/* ---------------- local development fallback ---------------- */

export class BroadcastSignaling implements SignalingChannel {
  readonly selfId: string;
  readonly transport = "local" as const;
  readonly iceServers: RTCIceServer[] = [];
  private channel: BroadcastChannel;
  private listeners = new Set<(msg: SignalMessage) => void>();
  private stateListeners = new Set<(s: ConnectionState) => void>();

  constructor(roomCode: string) {
    this.selfId = crypto.randomUUID();
    this.channel = new BroadcastChannel(`sm-classroom-${roomCode}`);
    this.channel.onmessage = (e) => {
      const msg = e.data as SignalMessage;
      this.listeners.forEach((cb) => cb(msg));
    };
    queueMicrotask(() => this.stateListeners.forEach((cb) => cb("connected")));
  }

  send(msg: SignalMessage) {
    this.channel.postMessage(msg);
  }

  onMessage(cb: (msg: SignalMessage) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  onState(cb: (state: ConnectionState) => void) {
    this.stateListeners.add(cb);
    return () => this.stateListeners.delete(cb);
  }

  close() {
    this.listeners.clear();
    this.stateListeners.clear();
    this.channel.close();
  }
}

/* ---------------- production WebSocket transport ---------------- */

export class SignalAuthRequiredError extends Error {
  constructor() {
    super("برای اتصال به سرور کلاس، ابتدا باید بلیت ورود دریافت شود");
    this.name = "SignalAuthRequiredError";
  }
}

interface WsSignalingOptions {
  baseUrl: string; // e.g. http://192.168.1.6:8081
  ticket: string;
  roomCode: string;
}

export class WebSocketSignaling implements SignalingChannel {
  selfId = ""; // assigned by the server in `hello`
  readonly transport = "websocket" as const;
  readonly iceServers: RTCIceServer[] = [];
  private ws: WebSocket | null = null;
  private listeners = new Set<(msg: SignalMessage) => void>();
  private stateListeners = new Set<(s: ConnectionState) => void>();
  private attempt = 0;
  private closedByUser = false;
  private reconnectTimer: number | undefined;
  private everConnected = false;
  private opts: WsSignalingOptions;

  private constructor(opts: WsSignalingOptions) {
    this.opts = opts;
  }

  /** Resolves once the server accepts the connection and the room join. */
  static async create(opts: WsSignalingOptions): Promise<WebSocketSignaling> {
    const instance = new WebSocketSignaling(opts);
    await instance.openFirst();
    return instance;
  }

  private emitState(s: ConnectionState) {
    this.stateListeners.forEach((cb) => cb(s));
  }

  private setState(s: ConnectionState) {
    this.emitState(s);
  }

  private wsUrl(): string {
    const wsBase = this.opts.baseUrl.replace(/^http/, "ws").replace(/\/$/, "");
    return `${wsBase}/signal?ticket=${encodeURIComponent(this.opts.ticket)}`;
  }

  private openFirst(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.setState("connecting");
      const ws = new WebSocket(this.wsUrl());
      this.ws = ws;

      const failTimer = window.setTimeout(() => {
        ws.close();
        reject(new Error("اتصال به سرور کلاس برقرار نشد"));
      }, 8000);

      ws.onmessage = (e) => {
        const data = JSON.parse(e.data as string);
        if (data.t === "hello") {
          this.selfId = data.selfId;
          if (Array.isArray(data.ice?.iceServers)) this.iceServers.push(...data.ice.iceServers);
          // join the classroom room
          ws.send(JSON.stringify({ t: "join", room: this.opts.roomCode }));
        }
        if (data.t === "joined") {
          this.everConnected = true;
          this.attempt = 0;
          window.clearTimeout(failTimer);
          this.setState("connected");
          resolve();
        }
        if (data.t === "presence") {
          this.listeners.forEach((cb) =>
            cb({ type: "presence", event: data.event, peer: data.peer })
          );
        }
        if (data.t === "relay") {
          this.listeners.forEach((cb) => cb(data.msg as SignalMessage));
        }
      };

      ws.onclose = () => {
        if (this.closedByUser) {
          this.setState("disconnected");
          return;
        }
        this.scheduleReconnect();
      };
      ws.onerror = () => {
        if (!this.everConnected) {
          window.clearTimeout(failTimer);
          reject(new Error("اتصال به سرور کلاس برقرار نشد"));
        }
      };
    });
  }

  private scheduleReconnect() {
    this.setState(this.everConnected ? "reconnecting" : "connecting");
    this.attempt += 1;
    if (this.attempt > 12) {
      this.setState("failed");
      return;
    }
    const backoff = Math.min(500 * 2 ** (this.attempt - 1), 8000);
    this.reconnectTimer = window.setTimeout(() => void this.reconnect(), backoff);
  }

  private async reconnect() {
    if (this.closedByUser) return;
    try {
      await this.openFirst();
      // the room is rejoined inside openFirst; session layer re-announces via state event
    } catch {
      this.scheduleReconnect();
    }
  }

  send(msg: SignalMessage) {
    if (this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ t: "relay", to: "to" in msg ? msg.to : undefined, msg }));
  }

  onMessage(cb: (msg: SignalMessage) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  onState(cb: (state: ConnectionState) => void) {
    this.stateListeners.add(cb);
    return () => this.stateListeners.delete(cb);
  }

  close() {
    this.closedByUser = true;
    window.clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.listeners.clear();
    this.stateListeners.clear();
    this.setState("disconnected");
  }
}

/* ---------------- factory: pick the transport explicitly ---------------- */

const SIGNAL_URL = (import.meta.env.VITE_SIGNAL_URL as string | undefined)?.trim() || "";
const MODE = (import.meta.env.VITE_SIGNALING_MODE as string | undefined)?.trim() || (SIGNAL_URL ? "remote" : "auto");

export function signalingMode(): { transport: "remote" | "local"; label: string } {
  if (MODE === "local") return { transport: "local", label: "حالت توسعه محلی (یک مرورگر)" };
  if (SIGNAL_URL) return { transport: "remote", label: "سرور سیگنالینگ فعال" };
  return {
    transport: import.meta.env.DEV ? "local" : "remote",
    label: import.meta.env.DEV ? "حالت توسعه محلی (یک مرورگر)" : "سرور تنظیم نشده",
  };
}

/**
 * Opens the production channel when configured; falls back to the local
 * BroadcastChannel ONLY when explicitly allowed (VITE_SIGNALING_MODE=local
 * or dev build without a server). Production builds throw instead of
 * silently degrading.
 */
export async function openSignaling(roomCode: string, ticket: string | null): Promise<SignalingChannel> {
  const useRemote = SIGNAL_URL && MODE !== "local";

  if (useRemote) {
    if (!ticket) throw new SignalAuthRequiredError();
    try {
      return await WebSocketSignaling.create({ baseUrl: SIGNAL_URL, ticket, roomCode });
    } catch (err) {
      if (import.meta.env.DEV && MODE === "auto") {
        console.warn("[signaling] server unreachable — falling back to LOCAL DEV mode (tabs only):", err);
      } else {
        throw err;
      }
    }
  }

  if (!import.meta.env.DEV) {
    throw new Error("سرور سیگنالینگ تنظیم نشده است (VITE_SIGNAL_URL)");
  }
  if (MODE !== "local" && SIGNAL_URL) {
    console.warn("[signaling] running in LOCAL DEV mode (BroadcastChannel) — tabs of one browser only");
  }
  return new BroadcastSignaling(roomCode);
}
