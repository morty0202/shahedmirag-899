/** Classroom scheduling + attendance API (localStorage-backed, auth-mock pattern). */

export interface ClassSession {
  id: string;
  title: string;
  subject: string;
  grade: string;
  date: { jy: number; jm: number; jd: number };
  time: string; // "HH:MM"
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

const SESSIONS_KEY = "sm_classsessions_v1";
const ATTENDANCE_KEY = "sm_attendance_v1";

const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms));

function read<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "") as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function roomCodeOf(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

export async function listSessions(): Promise<ClassSession[]> {
  await delay();
  return read<ClassSession[]>(SESSIONS_KEY, []).sort((a, b) =>
    `${a.date.jy}-${a.date.jm}-${a.date.jd} ${a.time}`.localeCompare(`${b.date.jy}-${b.date.jm}-${b.date.jd} ${b.time}`)
  );
}

export async function createSession(
  input: Omit<ClassSession, "id" | "roomCode" | "status">
): Promise<ClassSession> {
  await delay(300);
  const sessions = read<ClassSession[]>(SESSIONS_KEY, []);
  const created: ClassSession = {
    ...input,
    id: crypto.randomUUID(),
    roomCode: "",
    status: "scheduled",
  };
  created.roomCode = roomCodeOf(created.id);
  write(SESSIONS_KEY, [...sessions, created]);
  return created;
}

export async function deleteSession(id: string): Promise<void> {
  await delay(200);
  write(SESSIONS_KEY, read<ClassSession[]>(SESSIONS_KEY, []).filter((s) => s.id !== id));
}

export function getSession(id: string): ClassSession | undefined {
  return read<ClassSession[]>(SESSIONS_KEY, []).find((s) => s.id === id);
}

/** Called live by the realtime layer when someone joins/leaves a room. */
export function recordAttendance(roomCode: string, entry: AttendanceEntry) {
  const all = read<Record<string, AttendanceEntry[]>>(ATTENDANCE_KEY, {});
  all[roomCode] = [...(all[roomCode] ?? []), entry].slice(-200);
  write(ATTENDANCE_KEY, all);
}

/** Aggregated per-person presence for the teacher panel. */
export function attendanceOf(roomCode: string): { name: string; role: string; joins: number; lastJoin: number }[] {
  const entries = read<Record<string, AttendanceEntry[]>>(ATTENDANCE_KEY, {})[roomCode] ?? [];
  const map = new Map<string, { name: string; role: string; joins: number; lastJoin: number }>();
  for (const e of entries) {
    const cur = map.get(e.name) ?? { name: e.name, role: e.role, joins: 0, lastJoin: 0 };
    if (e.type === "join") {
      cur.joins += 1;
      cur.lastJoin = e.at;
    }
    map.set(e.name, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.lastJoin - a.lastJoin);
}
