/**
 * Settings API client — per-user theme & notification preferences.
 */

import { getAuthToken } from "./session";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface UserSettings {
  userId: string;
  theme: "dark" | "light";
  accent: string;
  bgStyle: string;
  notifyBooklets: boolean;
  notifyTrips: boolean;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    let error = "server_error";
    try {
      const body = await res.json();
      if (body.error) error = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(error);
  }
  return res.json();
}

export interface SettingsPatch {
  theme?: "dark" | "light";
  accent?: string;
  bgStyle?: string;
  notifyBooklets?: boolean;
  notifyTrips?: boolean;
}

export async function getSettings(): Promise<UserSettings> {
  const result = await request<{ ok: true; data: UserSettings }>("/api/settings");
  return result.data;
}

export async function saveSettings(patch: SettingsPatch): Promise<UserSettings> {
  const result = await request<{ ok: true; data: UserSettings }>("/api/settings", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return result.data;
}

/** Change the signed-in user's password (server verifies the current one). */
export async function changePassword(
  userId: string,
  current: string,
  next: string
): Promise<{ ok: boolean; error?: string }> {
  const token = getAuthToken();
  try {
    const res = await fetch(`${BASE}/api/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ userId, current, next }),
    });
    return (await res.json()) as { ok: boolean; error?: string };
  } catch {
    return { ok: false, error: "server_error" };
  }
}