/**
 * Assistant API client — chat with the school assistant backend.
 */

import { getAuthToken } from "./session";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export async function chatWithAssistant(message: string, history: ChatTurn[] = []): Promise<string> {
  const token = getAuthToken();
  // Client-side safety net: never hang forever (backend timeout is 75s/model).
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 150_000);
  try {
    const res = await fetch(`${BASE}/api/assistant/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message, history }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error("server_error");
    const body = await res.json();
    if (!body.ok) throw new Error(body.error ?? "server_error");
    return body.data.reply;
  } finally {
    clearTimeout(timer);
  }
}