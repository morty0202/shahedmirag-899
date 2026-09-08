/**
 * Classroom-server ticket management.
 *
 * The signaling server verifies username/password itself and returns a
 * signed ticket (JWT). Tickets live in localStorage and are attached to
 * the WebSocket upgrade URL — the server derives identity from the
 * ticket only, never from client-sent roles.
 */

const TICKET_KEY = "sm_signal_ticket";
const SIGNAL_URL = (import.meta.env.VITE_SIGNAL_URL as string | undefined)?.trim() || "";

export function getSignalTicket(): string | null {
  try {
    return localStorage.getItem(TICKET_KEY);
  } catch {
    return null;
  }
}

export function clearSignalTicket() {
  try {
    localStorage.removeItem(TICKET_KEY);
  } catch {
    /* ignore */
  }
}

/** Fetch (and store) a ticket for the classroom server. */
export async function fetchSignalTicket(username: string, password: string): Promise<{ ok: boolean; error?: string }> {
  if (!SIGNAL_URL) return { ok: false, error: "no-server" };
  try {
    const res = await fetch(`${SIGNAL_URL.replace(/\/$/, "")}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) return { ok: false, error: "invalid" };
    // The combined server answers {ok, data:{token,...}} while the standalone
    // signaling server answers {token,...} — accept both shapes.
    const data = (await res.json()) as
      | { token?: string; data?: { token?: string } }
      | undefined;
    const token = data?.token ?? data?.data?.token;
    if (!token) return { ok: false, error: "invalid" };
    localStorage.setItem(TICKET_KEY, token);
    return { ok: true };
  } catch {
    return { ok: false, error: "unreachable" };
  }
}

export function signalUrlConfigured(): boolean {
  return !!SIGNAL_URL;
}
