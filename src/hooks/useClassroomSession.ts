import { useCallback, useEffect, useRef, useState } from "react";
import { ClassroomSession, type SessionState } from "../lib/realtime/room";
import { acquireLocalStream } from "../lib/realtime/media";
import { openSignaling, SignalAuthRequiredError } from "../lib/realtime/signaling";
import type { Role } from "../lib/realtime/signaling";
import { recordAttendance } from "../lib/api/restClassrooms";
import { fetchSignalTicket, getSignalTicket } from "../lib/realtime/signalAuth";
import { useAuth } from "../auth/AuthContext";

export interface ClassroomJoinResult {
  state: SessionState | null;
  session: ClassroomSession | null;
  error: string | null;
  /** transport-level auth needed before joining (classroom server ticket) */
  needsTicket: boolean;
  submittingTicket: boolean;
  ticketError: string | null;
  submitTicket: (password: string) => Promise<boolean>;
  retry: () => void;
}

/** Joins a classroom through the real signaling server and mirrors state. */
export function useClassroomSession(roomCode: string): ClassroomJoinResult {
  const { user } = useAuth();
  const sessionRef = useRef<ClassroomSession | null>(null);
  const [state, setState] = useState<SessionState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsTicket, setNeedsTicket] = useState(false);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!user) return;
    let session: ClassroomSession | null = null;
    let unsub: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      try {
        const channel = await openSignaling(roomCode, getSignalTicket());
        if (cancelled) {
          channel.close();
          return;
        }
        const media = await acquireLocalStream(true, true);
        if (cancelled) {
          channel.close();
          media.stream.getTracks().forEach((t) => t.stop());
          return;
        }
        session = new ClassroomSession(
          channel,
          { name: `${user.firstName} ${user.lastName}`, role: user.role as Role },
          (ev) => recordAttendance(roomCode, { name: ev.peer.name, role: ev.peer.role, type: ev.type, at: ev.at })
        );
        sessionRef.current = session;
        unsub = session.onChange(setState);
        await session.join(media.stream);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof SignalAuthRequiredError) {
          setNeedsTicket(true);
        } else {
          setError(e instanceof Error ? e.message : "اتصال به کلاس ممکن نشد؛ دوباره تلاش کنید");
        }
      }
    })();

    return () => {
      cancelled = true;
      unsub?.();
      session?.leave();
      sessionRef.current = null;
    };
  }, [roomCode, user, attempt]);

  const retry = useCallback(() => {
    setError(null);
    setNeedsTicket(false);
    setAttempt((a) => a + 1);
  }, []);

  const submitTicket = useCallback(
    async (password: string): Promise<boolean> => {
      if (!user) return false;
      setSubmittingTicket(true);
      setTicketError(null);
      const result = await fetchSignalTicket(user.username, password);
      setSubmittingTicket(false);
      if (!result.ok) {
        setTicketError(
          result.error === "invalid" ? "رمز عبور نادرست است" : "سرور کلاس در دسترس نیست"
        );
        return false;
      }
      retry();
      return true;
    },
    [user, retry]
  );

  return { state, session: sessionRef.current, error, needsTicket, submittingTicket, ticketError, submitTicket, retry };
}
