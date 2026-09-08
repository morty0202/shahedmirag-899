/**
 * ClassroomSession — full-mesh P2P WebRTC room.
 *
 * Owns peer connections, media state, chat/hand/announcement flow and
 * teacher controls. UI talks to it only through events + methods, so the
 * same session class works under any frontend.
 */

import {
  adaptSenderQuality,
  getScreenStream,
  stopStream,
  watchConnectionQuality,
  type MediaQuality,
} from "./media";
import {
  type PollMsg,
  type PollState,
  type PresMsg,
  type PresState,
  type StageMode,
  type TimerMsg,
  type WbOp,
  type WbStroke,
  type SignalingChannel,
  type SignalMessage,
  type ConnectionState,
  type PeerInfo,
  type Role,
} from "./signaling";

export interface ChatEntry {
  id: string;
  peerId: string;
  name: string;
  role: Role;
  text: string;
  image?: string;
  ts: number;
}

export interface RemoteParticipant {
  peerId: string;
  name: string;
  role: Role;
  stream: MediaStream | null;
  handRaised: boolean;
  screenOn: boolean;
  micOn: boolean;
  quality: MediaQuality;
}

export interface AttendanceRow {
  peerId: string;
  name: string;
  role: Role;
  joinAt: number;
  leaveAt: number | null;
  joins: number;
}

export interface DeviceLists {
  mics: { id: string; label: string }[];
  cams: { id: string; label: string }[];
  speakers: { id: string; label: string }[];
}

export interface SessionState {
  participants: RemoteParticipant[];
  chat: ChatEntry[];
  announcements: { text: string; ts: number }[];
  myQuality: MediaQuality;
  micOn: boolean;
  camOn: boolean;
  micAvailable: boolean;
  camAvailable: boolean;
  screenOn: boolean;
  handRaised: boolean;
  connection: ConnectionState;
  transport: "websocket" | "local";
  kicked: string | null;
  elapsedSec: number;
  /* ---- extended classroom state ---- */
  locked: boolean;
  ended: boolean;
  micAllowed: boolean;
  camAllowed: boolean;
  wbEditable: boolean;
  stage: StageMode;
  pres: PresState;
  poll: PollState | null;
  iVoted: boolean;
  notes: string;
  timer: { remaining: number; running: boolean };
  recOn: boolean;
  recSec: number;
  questions: { id: string; name: string; text: string; ts: number }[];
  reactions: { id: string; name: string; emoji: string }[];
  attendance: AttendanceRow[];
  speakerId: string;
  devices: DeviceLists;
}

interface PeerRecord {
  info: PeerInfo;
  pc: RTCPeerConnection;
  participants: RemoteParticipant;
  /** stable receiver-side stream — survives track replacement (camera ↔ screen) */
  remoteStream?: MediaStream;
  unwatchQuality?: () => void;
  polite: boolean; // collision-avoidance role per ICE spec
  makingOffer?: boolean;
}

const ICE_SERVERS: RTCIceServer[] = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];

export class ClassroomSession {
  readonly me: PeerInfo;
  private signaling: SignalingChannel;
  private iceServers: RTCIceServer[] = ICE_SERVERS;
  private peers = new Map<string, PeerRecord>();
  private localStreamInternal: MediaStream | null = null;
  private cameraTrack: MediaStreamTrack | null = null; // original camera track while screen-sharing
  private screenStream: MediaStream | null = null;
  private state: SessionState;
  private listeners = new Set<(s: SessionState) => void>();
  private clock: number | undefined;
  private startedAt = Date.now();
  private onAttendance?: (ev: { type: "join" | "leave"; peer: PeerInfo; at: number }) => void;
  private wbStrokes: WbStroke[] = [];
  private wbPage = 0;
  private wbPages = 1;
  private recorder: MediaRecorder | null = null;
  private recChunks: Blob[] = [];
  private recBlob: Blob | null = null;
  private notesTimer: number | undefined;
  /** ICE candidates that arrived before the remote description existed. */
  private pendingIce = new Map<string, RTCIceCandidateInit[]>();
  private announceTimers: number[] = [];

  constructor(
    channel: SignalingChannel,
    me: { name: string; role: Role },
    attendanceSink?: (ev: { type: "join" | "leave"; peer: PeerInfo; at: number }) => void
  ) {
    this.signaling = channel;
    this.me = { peerId: channel.selfId, name: me.name, role: me.role };
    this.iceServers = channel.iceServers.length > 0 ? channel.iceServers : ICE_SERVERS;
    this.onAttendance = attendanceSink;
    this.state = {
      participants: [],
      chat: [],
      announcements: [],
      myQuality: { grade: "good", loss: 0, rtt: 0 },
      micOn: true,
      camOn: true,
      micAvailable: true,
      camAvailable: true,
      screenOn: false,
      handRaised: false,
      connection: "connecting",
      transport: channel.transport,
      kicked: null,
      elapsedSec: 0,
      locked: false,
      ended: false,
      micAllowed: me.role !== "student",
      camAllowed: true,
      wbEditable: me.role !== "student",
      stage: "video",
      pres: { open: false, name: "", kind: "pdf", data: "", page: 0 },
      poll: null,
      iVoted: false,
      notes: "",
      timer: { remaining: 0, running: false },
      recOn: false,
      recSec: 0,
      questions: [],
      reactions: [],
      attendance: [
        { peerId: channel.selfId, name: me.name, role: me.role, joinAt: Date.now(), leaveAt: null, joins: 1 },
      ],
      speakerId: "",
      devices: { mics: [], cams: [], speakers: [] },
    };
    this.clock = window.setInterval(() => {
      const p: Partial<SessionState> = {
        elapsedSec: Math.floor((Date.now() - this.startedAt) / 1000),
      };
      if (this.state.timer.running && this.state.timer.remaining > 0) {
        const remaining = Math.max(0, this.state.timer.remaining - 1);
        p.timer = { remaining, running: remaining > 0 };
      }
      if (this.state.recOn) p.recSec = this.state.recSec + 1;
      this.patch(p);
    }, 1000);

    // mirror transport connection state; re-announce the mesh after a reconnect
    this.signaling.onState((s) => {
      const wasDown = this.state.connection === "reconnecting" || this.state.connection === "disconnected";
      if (s === "connected" && wasDown) {
        // a fresh WS connection means a fresh server-assigned id — adopt it
        // BEFORE re-announcing, otherwise peers receive a join from a dead id
        // and every targeted reply would be unroutable
        const nid = this.signaling.selfId;
        if (nid && nid !== this.me.peerId) {
          this.patch({
            attendance: this.state.attendance.map((r) =>
              r.peerId === this.me.peerId ? { ...r, peerId: nid } : r,
            ),
          });
          (this.me as { peerId: string }).peerId = nid;
        }
        // transport is back — announce so every peer rebuilds its connection
        this.signaling.send({ type: "join", from: this.me });
      }
      this.patch({ connection: s });
    });
  }

  /* ---------------- lifecycle ---------------- */

  async join(stream: MediaStream) {
    this.localStreamInternal = stream;
    this.cameraTrack = stream.getVideoTracks()[0] ?? null;
    const audio = stream.getAudioTracks()[0];
    // students always join muted — speaking requires the teacher's permission
    if (audio && this.me.role === "student") audio.enabled = false;
    this.patch({
      micAvailable: stream.getAudioTracks().length > 0,
      camAvailable: !!this.cameraTrack,
      micOn: audio?.enabled ?? false,
      camOn: !!this.cameraTrack,
    });
    this.signaling.onMessage((m) => this.onSignal(m));
    this.signaling.send({ type: "join", from: this.me });
    // re-announce a few times — if the first broadcast races with another
    // peer's registration the mesh would otherwise never form
    this.announceTimers = [
      window.setTimeout(() => this.signaling.send({ type: "join", from: this.me }), 2000),
      window.setTimeout(() => this.signaling.send({ type: "join", from: this.me }), 6000),
    ];
    window.addEventListener("pagehide", this.leaveSilently);
    this.onAttendance?.({ type: "join", peer: this.me, at: Date.now() });
  }

  leave() {
    this.signaling.send({ type: "leave", from: this.me.peerId });
    this.onAttendance?.({ type: "leave", peer: this.me, at: Date.now() });
    this.teardown();
  }

  private leaveSilently = () => {
    try {
      this.signaling.send({ type: "leave", from: this.me.peerId });
      this.onAttendance?.({ type: "leave", peer: this.me, at: Date.now() });
    } catch {
      /* page is unloading */
    }
  };

  private teardown() {
    window.removeEventListener("pagehide", this.leaveSilently);
    window.clearInterval(this.clock);
    window.clearTimeout(this.notesTimer);
    this.announceTimers.forEach((t) => window.clearTimeout(t));
    this.announceTimers = [];
    if (this.recorder?.state === "recording") this.recorder.stop();
    this.peers.forEach((p) => {
      p.unwatchQuality?.();
      p.pc.close();
    });
    this.peers.clear();
    stopStream(this.screenStream);
    stopStream(this.localStreamInternal);
    this.signaling.close();
    this.patch({ connection: "disconnected", participants: [] });
  }

  onChange(cb: (s: SessionState) => void) {
    this.listeners.add(cb);
    cb(this.state);
    return () => this.listeners.delete(cb);
  }

  private patch(p: Partial<SessionState>) {
    this.state = { ...this.state, ...p };
    this.listeners.forEach((cb) => cb(this.state));
  }

  /* ---------------- local media controls ---------------- */

  toggleMic(): boolean {
    // students may not unmute themselves — the teacher grants speaking rights
    if (this.me.role === "student" && !this.state.micAllowed) {
      this.pushAnnouncement("برای صحبت، ابتدا دست بلند کنید و منتظر اجازه معلم بمانید");
      return this.state.micOn;
    }
    const track = this.localStreamInternal?.getAudioTracks()[0];
    if (!track) return false;
    track.enabled = !track.enabled;
    this.patch({ micOn: track.enabled });
    return track.enabled;
  }

  toggleCam(): boolean {
    const track = this.cameraTrack;
    if (!track) return false;
    track.enabled = !track.enabled;
    this.patch({ camOn: track.enabled });
    return track.enabled;
  }

  /** Replaces the outgoing video on every peer with the screen (or camera back). */
  async setScreenShare(on: boolean) {
    if (on) {
      this.screenStream = await getScreenStream();
      const screenTrack = this.screenStream.getVideoTracks()[0];
      screenTrack.addEventListener("ended", () => void this.setScreenShare(false));
      await this.setOutgoingVideo(screenTrack, this.screenStream);
      await this.applyMixedAudio();
      this.signaling.send({ type: "screen", from: this.me.peerId, on: true });
      this.patch({ screenOn: true });
    } else {
      const camTrack = this.cameraTrack;
      stopStream(this.screenStream);
      this.screenStream = null;
      await this.restoreMicAudio();
      await this.setOutgoingVideo(camTrack, this.localStreamInternal);
      this.signaling.send({ type: "screen", from: this.me.peerId, on: false });
      this.patch({ screenOn: false });
    }
  }

  /* ---- audio routing: mix microphone + screen audio into ONE outgoing track ---- */

  private mixCtx: AudioContext | null = null;

  /** Mixes mic + screen audio so remote peers hear the shared sound AND the teacher. */
  private async applyMixedAudio() {
    const micTrack = this.localStreamInternal?.getAudioTracks()[0] ?? null;
    const screenTrack = this.screenStream?.getAudioTracks()[0] ?? null;
    if (!micTrack && !screenTrack) return;
    try {
      const ctx = new AudioContext();
      const dest = ctx.createMediaStreamDestination();
      for (const t of [micTrack, screenTrack]) {
        if (t) ctx.createMediaStreamSource(new MediaStream([t])).connect(dest);
      }
      this.mixCtx = ctx;
      const mixed = dest.stream.getAudioTracks()[0];
      await this.setOutgoingAudio(mixed, dest.stream);
    } catch {
      /* mixing unsupported on this browser — plain mic audio keeps flowing */
    }
  }

  /** After sharing stops: restore the plain microphone track as outgoing audio. */
  private async restoreMicAudio() {
    const ctx = this.mixCtx;
    this.mixCtx = null;
    if (ctx) {
      try {
        await ctx.close();
      } catch {
        /* already closed */
      }
    }
    const micTrack = this.localStreamInternal?.getAudioTracks()[0] ?? null;
    if (!micTrack) return;
    await this.setOutgoingAudio(micTrack, this.localStreamInternal);
  }

  /** Sends `track` as the outgoing audio on every peer connection. */
  private async setOutgoingAudio(track: MediaStreamTrack | null, source: MediaStream | null) {
    for (const peer of this.peers.values()) {
      const pc = peer.pc;
      const atr =
        pc.getTransceivers().find((t) => t.sender.track?.kind === "audio") ??
        pc.getTransceivers().find((t) => t.receiver.track?.kind === "audio");
      if (atr) {
        let needsRenego = false;
        if (track && atr.direction === "recvonly") {
          atr.direction = "sendrecv";
          needsRenego = true;
        }
        if (atr.sender.track !== track) {
          try {
            await atr.sender.replaceTrack(track);
          } catch {
            /* mid-renegotiation */
          }
        }
        if (needsRenego && pc.signalingState === "stable" && !peer.makingOffer) {
          await this.makeOffer(peer);
        }
      } else if (track && source) {
        pc.addTrack(track, source);
        if (pc.signalingState === "stable" && !peer.makingOffer) {
          await this.makeOffer(peer);
        }
      }
    }
  }

  /**
   * Sends `track` as the outgoing video on every peer connection.
   * Handles BOTH topologies:
   *  - video m-line exists (camera was on) → cheap replaceTrack, no renegotiation
   *  - no video m-line (joined without camera) → addTrack + renegotiation so the
   *    screen actually reaches peers instead of silently going nowhere.
   * Passing `null` stops the outgoing video (screen share off with no camera).
   */
  private async setOutgoingVideo(track: MediaStreamTrack | null, source: MediaStream | null) {
    for (const peer of this.peers.values()) {
      const pc = peer.pc;
      const vtr =
        pc.getTransceivers().find((t) => t.sender.track?.kind === "video") ??
        pc.getTransceivers().find((t) => t.receiver.track?.kind === "video");
      if (vtr) {
        let needsRenego = false;
        if (track) {
          // a recv-only transceiver (we joined without a camera) must be
          // upgraded before replaceTrack, otherwise the m-line keeps its
          // recvonly direction and the video silently goes nowhere
          if (vtr.direction === "recvonly") {
            vtr.direction = "sendrecv";
            needsRenego = true;
          }
          if (vtr.sender.track !== track) {
            try {
              await vtr.sender.replaceTrack(track);
            } catch {
              /* mid-renegotiation — retried by the next state change */
            }
          }
        } else if (vtr.sender.track) {
          try {
            await vtr.sender.replaceTrack(null);
          } catch {
            /* mid-renegotiation */
          }
        }
        if (needsRenego && pc.signalingState === "stable" && !peer.makingOffer) {
          await this.makeOffer(peer);
        }
      } else if (track && source) {
        pc.addTrack(track, source);
        if (pc.signalingState === "stable" && !peer.makingOffer) {
          await this.makeOffer(peer);
        }
      }
    }
  }

  setHand(raised: boolean) {
    this.signaling.send({ type: "hand", from: this.me.peerId, raised });
    this.patch({ handRaised: raised });
  }

  /* ---------------- chat / announcements ---------------- */

  sendChat(text: string, image?: string) {
    if (!text.trim() && !image) return;
    this.signaling.send({
      type: "chat",
      from: this.me.peerId,
      name: this.me.name,
      role: this.me.role,
      text: text.trim(),
      image,
      ts: Date.now(),
    });
    this.appendChat({ peerId: this.me.peerId, name: "شما", role: this.me.role, text: text.trim(), image, ts: Date.now() });
  }

  announce(text: string) {
    if (!text.trim()) return;
    this.signaling.send({ type: "announce", from: this.me.peerId, text: text.trim() });
    this.pushAnnouncement(text.trim());
  }

  private pushAnnouncement(text: string) {
    this.patch({ announcements: [...this.state.announcements, { text, ts: Date.now() }].slice(-20) });
  }

  /* ---------------- teacher controls ---------------- */

  requestMute(peerId: string) {
    this.signaling.send({ type: "mute-request", to: peerId });
  }

  kick(peerId: string, reason?: string) {
    this.signaling.send({ type: "kick", to: peerId, reason });
  }

  /* ================= extended classroom API ================= */

  muteAll() {
    if (!this.isHost) return;
    this.signaling.send({ type: "mute-all" });
    this.pushAnnouncement("میکروفون همه توسط معلم خاموش شد");
  }

  setPeerPerm(peerId: string, kind: "mic" | "cam", allowed: boolean) {
    if (!this.isHost) return;
    this.signaling.send({ type: "perm", to: peerId, kind, allowed });
  }

  lockRoom(locked: boolean) {
    if (!this.isHost) return;
    this.signaling.send({ type: "lock", locked });
    this.patch({ locked });
    this.pushAnnouncement(locked ? "کلاس قفل شد" : "قفل کلاس برداشته شد");
  }

  endClass() {
    if (!this.isHost) return;
    this.signaling.send({ type: "end" });
    this.patch({ ended: true });
  }

  setStage(mode: StageMode) {
    this.signaling.send({ type: "stage", mode });
    this.patch({ stage: mode });
  }

  /* ---- whiteboard (local store + sync) ---- */

  private wbListeners = new Set<() => void>();
  private wbEmit() {
    this.wbListeners.forEach((cb) => cb());
  }

  /** Subscribe to whiteboard data changes (outside React state for performance). */
  onWbChange(cb: () => void): () => void {
    this.wbListeners.add(cb);
    cb();
    return () => this.wbListeners.delete(cb);
  }

  wbGet(): { strokes: WbStroke[]; page: number; pages: number } {
    return { strokes: this.wbStrokes, page: this.wbPage, pages: this.wbPages };
  }

  /** Applies an op locally and broadcasts it — the only write path for the UI. */
  wbCommit(op: WbOp) {
    this.wbApply(op, undefined, true);
    this.signaling.send({ type: "wb", op });
  }

  wbSyncRequest() {
    this.signaling.send({ type: "wb", op: { kind: "sync-req" } });
  }

  private wbRespond(to?: string) {
    if (this.wbStrokes.length === 0 && !this.isHost) return;
    this.signaling.send({
      type: "wb",
      to,
      op: {
        kind: "snapshot",
        strokes: this.wbStrokes,
        page: this.wbPage,
        pages: this.wbPages,
        editable: this.state.wbEditable,
      },
    });
  }

  private wbApply(op: WbOp, from: string | undefined, local: boolean) {
    switch (op.kind) {
      case "snapshot": {
        const mine = this.wbStrokes.length;
        if (op.strokes.length < mine && mine > 0) return; // keep the richer board
        this.wbStrokes = op.strokes;
        this.wbPage = op.page;
        this.wbPages = Math.max(1, op.pages);
        if (!this.isHost) this.patch({ wbEditable: op.editable });
        break;
      }
      case "add":
        this.wbStrokes = [...this.wbStrokes.filter((s) => s.id !== op.stroke.id), op.stroke];
        break;
      case "remove":
        this.wbStrokes = this.wbStrokes.filter((s) => s.id !== op.id);
        break;
      case "clear":
        this.wbStrokes = this.wbStrokes.filter((s) => s.page !== op.page);
        break;
      case "pages":
        this.wbPages = Math.max(1, op.count);
        break;
      case "goto":
        this.wbPage = Math.min(Math.max(0, op.page), this.wbPages - 1);
        break;
      case "perm":
        if (!this.isHost) this.patch({ wbEditable: op.editable });
        break;
      case "sync-req":
        if (!local) this.wbRespond(from);
        break;
    }
    this.wbEmit();
  }

  /* ---- presentation (teacher-controlled) ---- */

  presSend(msg: PresMsg) {
    if (!this.isHost) return;
    this.presApply(msg);
    this.signaling.send({ type: "pres", msg });
  }

  private presApply(msg: PresMsg) {
    if (msg.action === "open") {
      this.patch({
        pres: { open: true, name: msg.name, kind: msg.kind, data: msg.data, page: 0 },
        stage: "pres",
      });
      this.pushAnnouncement(`ارائه «${msg.name}» شروع شد`);
    } else if (msg.action === "page") {
      this.patch({ pres: { ...this.state.pres, page: msg.page } });
    } else {
      this.patch({
        pres: { open: false, name: "", kind: "pdf", data: "", page: 0 },
        stage: "video",
      });
    }
  }

  /* ---- polls ---- */

  pollSend(msg: PollMsg) {
    if (msg.action === "vote") {
      if (this.state.iVoted) return;
      this.patch({ iVoted: true });
    } else if (!this.isHost) return;
    this.pollApply(msg);
    this.signaling.send({ type: "poll", msg });
  }

  private pollApply(msg: PollMsg) {
    if (msg.action === "start") {
      this.patch({
        poll: { q: msg.q, opts: msg.opts, votes: msg.opts.map(() => 0), open: true },
        iVoted: false,
      });
    } else if (msg.action === "vote") {
      const poll = this.state.poll;
      if (!poll) return;
      const votes = [...poll.votes];
      votes[msg.idx] = (votes[msg.idx] ?? 0) + 1;
      this.patch({ poll: { ...poll, votes } });
    } else if (this.state.poll) {
      this.patch({ poll: { ...this.state.poll, open: false } });
    }
  }

  /* ---- shared notes (debounced broadcast) ---- */

  sendNotes(text: string) {
    this.patch({ notes: text });
    window.clearTimeout(this.notesTimer);
    this.notesTimer = window.setTimeout(() => {
      this.signaling.send({ type: "notes", text: this.state.notes });
    }, 400);
  }

  /* ---- shared timer (teacher-controlled) ---- */

  timerSend(msg: TimerMsg) {
    if (!this.isHost) return;
    this.timerApply(msg);
    this.signaling.send({ type: "timer", msg });
  }

  private timerApply(msg: TimerMsg) {
    if (msg.action === "start") {
      this.patch({ timer: { remaining: msg.remaining ?? 300, running: true } });
    } else if (msg.action === "pause") {
      this.patch({ timer: { ...this.state.timer, running: false } });
    } else {
      this.patch({ timer: { remaining: 0, running: false } });
    }
  }

  /* ---- questions & reactions ---- */

  askQuestion(text: string) {
    if (!text.trim()) return;
    const id = crypto.randomUUID();
    this.signaling.send({ type: "question", id, name: this.me.name, text: text.trim() });
    this.patch({
      questions: [...this.state.questions, { id, name: "شما", text: text.trim(), ts: Date.now() }].slice(-30),
    });
  }

  clearQuestions() {
    if (!this.isHost) return;
    this.signaling.send({ type: "question", id: "", name: "", text: "", clear: true });
    this.patch({ questions: [] });
  }

  sendReaction(emoji: string) {
    const id = crypto.randomUUID();
    this.signaling.send({ type: "reaction", id, name: this.me.name, emoji });
    this.pushReaction({ id, name: "شما", emoji });
  }

  private pushReaction(r: { id: string; name: string; emoji: string }) {
    this.patch({ reactions: [...this.state.reactions, r].slice(-12) });
    window.setTimeout(() => {
      this.patch({ reactions: this.state.reactions.filter((x) => x.id !== r.id) });
    }, 3500);
  }

  /* ---- recording (teacher) ---- */

  async toggleRecording(): Promise<void> {
    if (this.recorder) {
      this.recorder.stop();
      return;
    }
    if (!this.isHost) return;
    const stream = this.screenStream ?? this.localStreamInternal;
    if (!stream || stream.getTracks().length === 0) {
      this.pushAnnouncement("برای ضبط، دوربین یا اشتراک صفحه باید فعال باشد");
      return;
    }
    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "";
    try {
      this.recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    } catch {
      this.pushAnnouncement("مرورگر از ضبط پشتیبانی نمی‌کند");
      return;
    }
    this.recChunks = [];
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.recChunks.push(e.data);
    };
    this.recorder.onstop = () => {
      this.recBlob = new Blob(this.recChunks, { type: "video/webm" });
      this.recorder = null;
      this.signaling.send({ type: "rec", on: false });
      this.patch({ recOn: false });
    };
    this.recorder.start(2000);
    this.signaling.send({ type: "rec", on: true });
    this.patch({ recOn: true, recSec: 0 });
    this.pushAnnouncement("ضبط کلاس شروع شد");
  }

  /** Returns the finished recording blob (once) after stopRecording. */
  takeRecording(): Blob | null {
    const b = this.recBlob;
    this.recBlob = null;
    return b;
  }

  /* ---- device selection ---- */

  async refreshDevices(): Promise<void> {
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      let mi = 0;
      let ci = 0;
      let si = 0;
      this.patch({
        devices: {
          mics: devs.filter((d) => d.kind === "audioinput").map((d) => ({ id: d.deviceId, label: d.label || `میکروفون ${++mi}` })),
          cams: devs.filter((d) => d.kind === "videoinput").map((d) => ({ id: d.deviceId, label: d.label || `دوربین ${++ci}` })),
          speakers: devs.filter((d) => d.kind === "audiooutput").map((d) => ({ id: d.deviceId, label: d.label || `بلندگو ${++si}` })),
        },
      });
    } catch {
      /* enumeration unavailable — keep current */
    }
  }

  async switchMic(deviceId: string): Promise<void> {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId }, echoCancellation: true, noiseSuppression: true },
      });
      const next = s.getAudioTracks()[0];
      const old = this.localStreamInternal?.getAudioTracks()[0];
      if (old) {
        old.stop();
        this.localStreamInternal?.removeTrack(old);
      }
      this.localStreamInternal?.addTrack(next);
      next.enabled = this.state.micOn && this.state.micAllowed;
      for (const peer of this.peers.values()) {
        const sender = peer.pc.getSenders().find((x) => x.track?.kind === "audio");
        if (sender) await sender.replaceTrack(next);
      }
      await this.refreshDevices();
    } catch {
      /* keep current mic on failure */
    }
  }

  async switchCam(deviceId: string): Promise<void> {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      const next = s.getVideoTracks()[0];
      const old = this.cameraTrack;
      if (old) {
        old.stop();
        this.localStreamInternal?.removeTrack(old);
      }
      this.localStreamInternal?.addTrack(next);
      this.cameraTrack = next;
      next.enabled = this.state.camOn && this.state.camAllowed;
      if (!this.state.screenOn) {
        for (const peer of this.peers.values()) {
          const sender = peer.pc.getSenders().find((x) => x.track?.kind === "video");
          if (sender) await sender.replaceTrack(next);
        }
      }
      await this.refreshDevices();
    } catch {
      /* keep current camera on failure */
    }
  }

  setSpeaker(id: string) {
    this.patch({ speakerId: id });
  }

  /* ---- attendance tracking (local, join/leave per peer) ---- */

  private trackJoin(info: PeerInfo) {
    const open = this.state.attendance.find((r) => r.peerId === info.peerId && !r.leaveAt);
    if (open) return;
    this.patch({
      attendance: [
        ...this.state.attendance,
        { peerId: info.peerId, name: info.name, role: info.role, joinAt: Date.now(), leaveAt: null, joins: 1 },
      ],
    });
  }

  private trackLeave(peerId: string) {
    const open = this.state.attendance.find((r) => r.peerId === peerId && !r.leaveAt);
    if (!open) return;
    this.patch({
      attendance: this.state.attendance.map((r) => (r === open ? { ...r, leaveAt: Date.now() } : r)),
    });
  }

  get isHost() {
    return this.me.role !== "student";
  }

  /** Local camera stream — used by the UI to render the self tile. */
  get localStream(): MediaStream | null {
    return this.localStreamInternal;
  }

  /** Active local screen capture — rendered as the main stage while sharing. */
  get screenShareStream(): MediaStream | null {
    return this.screenStream;
  }

  /* ---------------- signaling / peer wiring ---------------- */

  private onSignal(msg: SignalMessage) {
    switch (msg.type) {
      case "join":
        this.signaling.send({ type: "welcome", to: msg.from.peerId, from: this.me });
        this.connectTo(msg.from, /* initiator */ this.me.peerId < msg.from.peerId);
        break;
      case "welcome":
        if (msg.to === this.me.peerId) this.connectTo(msg.from, this.me.peerId < msg.from.peerId);
        break;
      case "offer":
        if (msg.to === this.me.peerId) this.handleOffer(msg.from, msg.sdp);
        break;
      case "answer":
        if (msg.to === this.me.peerId) void this.handleAnswer(msg.from, msg.sdp);
        break;
      case "ice":
        if (msg.to === this.me.peerId) void this.handleIce(msg.from, msg.cand);
        break;
      case "leave":
        this.removePeer(msg.from);
        break;
      case "chat":
        this.appendChat({ peerId: msg.from, name: msg.name, role: msg.role, text: msg.text, image: msg.image, ts: msg.ts });
        break;
      case "hand": {
        const p = this.peerState(msg.from);
        if (p) {
          p.participants.handRaised = msg.raised;
          this.emitParticipants();
        }
        break;
      }
      case "screen": {
        const p = this.peerState(msg.from);
        if (p) {
          p.participants.screenOn = msg.on;
          this.emitParticipants();
        }
        // auto-follow whoever shares the screen
        if (msg.on && this.state.stage === "video") this.patch({ stage: "screen" });
        if (!msg.on && this.state.stage === "screen" && !this.state.screenOn) this.patch({ stage: "video" });
        break;
      }
      case "mute-request":
        if (msg.to === this.me.peerId) {
          if (this.state.micOn) this.toggleMic();
          this.pushAnnouncement("معلم درخواست کرد میکروفون شما خاموش شود");
        }
        break;
      case "kick":
        if (msg.to === this.me.peerId) {
          this.patch({ kicked: msg.reason ?? "به درخواست معلم از کلاس خارج شدید" });
          this.leave();
        }
        break;
      case "announce":
        this.pushAnnouncement(msg.text);
        break;
      case "perm":
        if (msg.to === this.me.peerId) {
          if (msg.kind === "mic") {
            this.patch({ micAllowed: msg.allowed });
            // grant → mic turns on automatically; revoke → mic turns off
            if (msg.allowed) {
              if (!this.state.micOn) this.toggleMic();
            } else if (this.state.micOn) {
              this.toggleMic();
            }
          } else {
            if (!msg.allowed && this.state.camOn) this.toggleCam();
            this.patch({ camAllowed: msg.allowed });
          }
          this.pushAnnouncement(
            msg.allowed
              ? msg.kind === "mic" ? "میکروفون شما توسط معلم مجاز شد" : "دوربین شما توسط معلم مجاز شد"
              : msg.kind === "mic" ? "میکروفون شما توسط معلم غیرفعال شد" : "دوربین شما توسط معلم غیرفعال شد",
          );
        }
        break;
      case "mute-all":
        if (!this.isHost && this.state.micOn) this.toggleMic();
        this.pushAnnouncement("میکروفون همه توسط معلم خاموش شد");
        break;
      case "lock":
        this.patch({ locked: msg.locked });
        this.pushAnnouncement(msg.locked ? "کلاس قفل شد" : "قفل کلاس برداشته شد");
        break;
      case "end":
        this.patch({ ended: true });
        break;
      case "stage":
        this.patch({ stage: msg.mode });
        break;
      case "wb":
        if (msg.to && msg.to !== this.me.peerId) break;
        this.wbApply(msg.op, msg.from, false);
        break;
      case "pres":
        this.presApply(msg.msg);
        break;
      case "poll":
        this.pollApply(msg.msg);
        break;
      case "notes":
        if (!this.isHost) this.patch({ notes: msg.text });
        break;
      case "timer":
        this.timerApply(msg.msg);
        break;
      case "rec":
        this.patch({ recOn: msg.on, recSec: msg.on ? 0 : this.state.recSec });
        break;
      case "question":
        if (msg.clear) this.patch({ questions: [] });
        else
          this.patch({
            questions: [...this.state.questions, { id: msg.id, name: msg.name, text: msg.text, ts: Date.now() }].slice(-30),
          });
        break;
      case "reaction":
        this.pushReaction({ id: msg.id, name: msg.name, emoji: msg.emoji });
        break;
      case "presence":
        this.handlePresence(msg.event, msg.peer);
        break;
    }
  }

  /** Server-verified membership: instant roster, media still connects P2P. */
  private handlePresence(event: "join" | "leave", peer: PeerInfo) {
    if (peer.peerId === this.me.peerId) return;
    if (event === "join") {
      this.trackJoin(peer);
      // seed a roster entry even before the P2P link is up
      if (!this.peers.has(peer.peerId)) {
        const pc = new RTCPeerConnection({ iceServers: this.iceServers });
        const rec: PeerRecord = {
          info: peer,
          pc,
          participants: this.participantOf(peer),
          polite: this.me.peerId > peer.peerId,
        };
        this.peers.set(peer.peerId, rec);
        this.wirePeer(rec);
        if (this.localStreamInternal) {
          for (const track of this.localStreamInternal.getTracks()) {
            rec.pc.addTrack(track, this.localStreamInternal);
          }
        }
        this.emitParticipants();
      }
      // deterministic initiator avoids double-offers
      if (this.me.peerId < peer.peerId) {
        const rec = this.peers.get(peer.peerId);
        if (rec && rec.pc.signalingState === "stable" && !rec.makingOffer) void this.makeOffer(rec);
      }
    } else {
      this.removePeer(peer.peerId);
    }
  }

  private peerState(peerId: string): PeerRecord | undefined {
    return this.peers.get(peerId);
  }

  private participantOf(info: PeerInfo): RemoteParticipant {
    return {
      peerId: info.peerId,
      name: info.name,
      role: info.role,
      stream: null,
      handRaised: false,
      screenOn: false,
      micOn: true,
      quality: { grade: "good", loss: 0, rtt: 0 },
    };
  }

  private connectTo(info: PeerInfo, initiator: boolean) {
    if (info.peerId === this.me.peerId) return;
    this.trackJoin(info);
    let rec = this.peers.get(info.peerId);
    if (!rec) {
      const pc = new RTCPeerConnection({ iceServers: this.iceServers });
      rec = {
        info,
        pc,
        participants: this.participantOf(info),
        polite: this.me.peerId > info.peerId,
      };
      this.peers.set(info.peerId, rec);
      this.wirePeer(rec);
    }

    // attach local tracks
    if (this.localStreamInternal) {
      for (const track of this.localStreamInternal.getTracks()) {
        if (!rec.pc.getSenders().some((s) => s.track === track)) {
          rec.pc.addTrack(track, this.localStreamInternal);
        }
      }
      // screen share already active? route it to the newcomer too
      const screenTrack = this.screenStream?.getVideoTracks()[0];
      if (screenTrack && this.screenStream) {
        // reuse the shared writer — it upgrades recvonly transceivers and
        // renegotiates so a late joiner actually receives the screen
        void this.setOutgoingVideo(screenTrack, this.screenStream);
      }
    }

    if (initiator && rec.pc.signalingState === "stable" && !rec.makingOffer) {
      void this.makeOffer(rec);
    }
    this.emitParticipants();
  }

  private wirePeer(rec: PeerRecord) {
    rec.pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.signaling.send({ type: "ice", to: rec.info.peerId, from: this.me.peerId, cand: e.candidate.toJSON() });
      }
    };
    rec.pc.ontrack = (e) => {
      // stable per-peer stream: merge tracks from every ontrack so a track
      // added later (e.g. screen share via renegotiation) joins the SAME
      // stream instead of orphaning the audio in the old one
      if (!rec.remoteStream) rec.remoteStream = new MediaStream();
      const incoming = e.streams[0];
      const tracks = incoming ? incoming.getTracks() : [e.track];
      for (const t of tracks) {
        if (!rec.remoteStream.getTracks().some((x) => x.id === t.id)) {
          rec.remoteStream.addTrack(t);
        }
      }
      rec.participants.stream = rec.remoteStream;
      rec.participants.micOn = rec.remoteStream.getAudioTracks()[0]?.enabled ?? false;
      this.emitParticipants();
    };
    rec.pc.onconnectionstatechange = () => {
      const st = rec.pc.connectionState;
      if (st === "connected") {
        this.patch({ connection: "connected" });
        rec.unwatchQuality?.();
        rec.unwatchQuality = watchConnectionQuality(rec.pc, (q) => {
          rec.participants.quality = q;
          this.emitParticipants();
          void adaptSenderQuality(rec.pc, q);
        });
      }
      if (st === "failed" || st === "disconnected") {
        this.patch({ connection: "reconnecting" });
        void this.iceRestart(rec);
      }
    };
  }

  private async makeOffer(rec: PeerRecord, iceRestart = false) {
    try {
      rec.makingOffer = true;
      const offer = await rec.pc.createOffer({ iceRestart });
      await rec.pc.setLocalDescription(offer);
      this.signaling.send({ type: "offer", to: rec.info.peerId, from: this.me.peerId, sdp: offer });
    } catch {
      /* transient — retry on next state change */
    } finally {
      rec.makingOffer = false;
    }
  }

  private async handleOffer(from: string, sdp: RTCSessionDescriptionInit) {
    let rec = this.peers.get(from);
    if (!rec) {
      // answerer path: peer saw our join/welcome
      const info: PeerInfo = { peerId: from, name: "همکلاسی", role: "student" };
      const pc = new RTCPeerConnection({ iceServers: this.iceServers });
      rec = { info, pc, participants: this.participantOf(info), polite: this.me.peerId > from };
      this.peers.set(from, rec);
      this.wirePeer(rec);
      if (this.localStreamInternal) {
        for (const track of this.localStreamInternal.getTracks()) rec.pc.addTrack(track, this.localStreamInternal);
      }
    }
    const offerCollision = rec.pc.signalingState !== "stable" || rec.makingOffer;
    if (offerCollision && !rec.polite) return;
    // for the polite peer this performs an implicit rollback of our local offer
    await rec.pc.setRemoteDescription(sdp);
    // candidates buffered before this point are now applicable
    this.flushPendingIce(from);
    const answer = await rec.pc.createAnswer();
    await rec.pc.setLocalDescription(answer);
    this.signaling.send({ type: "answer", to: from, from: this.me.peerId, sdp: answer });
    this.emitParticipants();
  }

  private async handleAnswer(from: string, sdp: RTCSessionDescriptionInit) {
    const rec = this.peers.get(from);
    if (!rec) return;
    if (rec.pc.signalingState === "have-local-offer") {
      await rec.pc.setRemoteDescription(sdp);
      // candidates queued while waiting for the answer can now be applied
      this.flushPendingIce(from);
    }
  }

  private async handleIce(from: string, cand: RTCIceCandidateInit) {
    const rec = this.peers.get(from);
    // candidates may legitimately arrive BEFORE the offer/answer that carries
    // the remote description — addIceCandidate would throw InvalidStateError
    // and the candidate would be lost forever, leaving ICE half-connected
    // (signaling looks fine but NO audio/video ever flows). Buffer instead.
    if (!rec || !rec.pc.remoteDescription) {
      const q = this.pendingIce.get(from) ?? [];
      q.push(cand);
      this.pendingIce.set(from, q);
      return;
    }
    try {
      await rec.pc.addIceCandidate(cand);
    } catch {
      /* stale candidate after restart — ignored per ICE restart semantics */
    }
  }

  /** Applies ICE candidates that were buffered before the remote description. */
  private flushPendingIce(peerId: string) {
    const rec = this.peers.get(peerId);
    const queue = this.pendingIce.get(peerId);
    if (!rec || !queue?.length) return;
    this.pendingIce.delete(peerId);
    void (async () => {
      for (const c of queue) {
        try {
          await rec.pc.addIceCandidate(c);
        } catch {
          /* stale — skip */
        }
      }
    })();
  }

  private async iceRestart(rec: PeerRecord) {
    await new Promise((r) => setTimeout(r, 1500));
    if (rec.pc.connectionState === "failed" || rec.pc.connectionState === "disconnected") {
      if (rec.pc.signalingState === "stable") await this.makeOffer(rec, true);
      // re-announce so any fresh peers rebuild the mesh
      this.signaling.send({ type: "join", from: this.me });
    }
  }

  private removePeer(peerId: string) {
    const rec = this.peers.get(peerId);
    if (!rec) return;
    this.pendingIce.delete(peerId);
    this.trackLeave(peerId);
    rec.unwatchQuality?.();
    rec.pc.close();
    this.peers.delete(peerId);
    this.emitParticipants();
  }

  private emitParticipants() {
    this.patch({ participants: Array.from(this.peers.values()).map((p) => ({ ...p.participants })) });
  }

  private appendChat(entry: Omit<ChatEntry, "id">) {
    this.patch({
      chat: [...this.state.chat, { ...entry, id: crypto.randomUUID() }].slice(-150),
    });
  }
}
