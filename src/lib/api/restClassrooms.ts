/**
 * REST adapter for Classrooms API — connects to the real Express backend.
 */

import { getAuthToken } from "./session";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

function getToken(): string | null {
  return getAuthToken();
}

function headers() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...headers(), ...options.headers },
  });
  if (!res.ok) {
    try {
      const body = await res.json();
      if (body.error) throw new Error(body.error);
    } catch {}
    throw new Error("server_error");
  }
  return res.json();
}

export interface ClassSession {
  id: string;
  title: string;
  subject: string;
  grade: string;
  date: { jy: number; jm: number; jd: number };
  time: string;
  durationMin: number;
  roomCode: string;
  teacherName: string;
  status: "scheduled" | "ended";
}

export interface AttendanceEntry {
  name: string;
  role: "student" | "teacher" | "admin";
  type: "join" | "leave";
  at: number;
}

export function roomCodeOf(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

export async function listSessions(): Promise<ClassSession[]> {
  return request<ClassSession[]>("/api/classrooms/sessions");
}

export async function createSession(
  input: Omit<ClassSession, "id" | "roomCode" | "status">
): Promise<ClassSession> {
  return request<ClassSession>("/api/classrooms/sessions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteSession(id: string): Promise<void> {
  await request(`/api/classrooms/sessions/${id}`, { method: "DELETE" });
}

export async function getSession(id: string): Promise<ClassSession | undefined> {
  try {
    return await request<ClassSession>(`/api/classrooms/sessions/${id}`);
  } catch {
    return undefined;
  }
}

/** Called by the realtime layer when someone joins/leaves a room. */
export async function recordAttendance(roomCode: string, entry: AttendanceEntry): Promise<void> {
  await request("/api/classrooms/attendance", {
    method: "POST",
    body: JSON.stringify({ roomCode, ...entry }),
  });
}

/** Aggregated per-person presence for the teacher panel. */
export async function attendanceOf(roomCode: string): Promise<{ name: string; role: string; joins: number; lastJoin: number }[]> {
  return request(`/api/classrooms/attendance/${roomCode}`);
}
