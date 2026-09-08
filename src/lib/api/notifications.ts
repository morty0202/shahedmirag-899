/**
 * Notifications API client.
 */

import { getAuthToken } from "./session";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
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

export async function listNotifications(): Promise<Notification[]> {
  return request<Notification[]>("/api/notifications");
}

export async function markNotificationRead(id: string): Promise<void> {
  await request(`/api/notifications/${id}/read`, { method: "PATCH" });
}

export async function markAllNotificationsRead(): Promise<void> {
  await request("/api/notifications/read-all", { method: "PATCH" });
}
