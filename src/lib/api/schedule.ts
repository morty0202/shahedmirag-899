/**
 * Schedule API client.
 */

import { getAuthToken } from "./session";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface ScheduleItem {
  id: string;
  time: string;
  lesson: string;
  room: string;
  teacher: string;
  status: string;
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

export async function listSchedule(): Promise<ScheduleItem[]> {
  return request<ScheduleItem[]>("/api/schedule");
}

export async function createScheduleItem(input: { time: string; lesson: string; room: string; teacher: string; status?: string }) {
  const result = await request<{ ok: true; data: ScheduleItem } | { ok: false; error: string }>(
    "/api/schedule",
    { method: "POST", body: JSON.stringify(input) }
  );
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function updateScheduleItem(id: string, input: Partial<{ time: string; lesson: string; room: string; teacher: string; status: string }>) {
  const result = await request<{ ok: true; data: ScheduleItem } | { ok: false; error: string }>(
    `/api/schedule/${id}`,
    { method: "PATCH", body: JSON.stringify(input) }
  );
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export async function deleteScheduleItem(id: string): Promise<void> {
  await request(`/api/schedule/${id}`, { method: "DELETE" });
}
