/**
 * Dashboard API client — today's schedule served by the backend.
 */

import { getAuthToken } from "./session";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface ScheduleItem {
  id: number;
  time: string;
  lesson: string;
  room: string;
  teacher: string;
  status: "passed" | "current" | "upcoming";
}

export async function getTodaySchedule(): Promise<ScheduleItem[]> {
  const token = getAuthToken();
  const res = await fetch(`${BASE}/api/dashboard/schedule`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("server_error");
  return res.json();
}