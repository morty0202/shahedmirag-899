/**
 * Education API client — booklets & videos per grade/classroom.
 */

import { getAuthToken } from "./session";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface EducationItem {
  id: string;
  gradeId: string;
  classroomId: string;
  title: string;
  kind: "file" | "video";
  name: string;
  sizeLabel: string;
  sizeBytes: number;
  mime: string;
  dataUrl?: string;
  uploaderId?: string;
  uploaderName: string;
  createdAt: string;
}

export interface EducationUploadInput {
  gradeId: string;
  classroomId: string;
  title?: string;
  kind: "file" | "video";
  name: string;
  sizeLabel: string;
  sizeBytes: number;
  mime: string;
  dataUrl: string;
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

/** List education items, optionally filtered by grade/classroom. */
export async function listEducationItems(gradeId?: string, classroomId?: string): Promise<EducationItem[]> {
  const params = new URLSearchParams();
  if (gradeId) params.set("grade", gradeId);
  if (classroomId) params.set("classroom", classroomId);
  const qs = params.toString();
  return request<EducationItem[]>(`/api/education/items${qs ? `?${qs}` : ""}`);
}

/** Files uploaded by the current user (for «فایل‌های من»). */
export async function listMyFiles(): Promise<EducationItem[]> {
  return request<EducationItem[]>("/api/education/mine");
}

/** Upload a booklet/video (teacher/admin). */
export async function uploadEducationItem(input: EducationUploadInput): Promise<EducationItem> {
  const result = await request<{ ok: true; data: EducationItem } | { ok: false; error: string }>(
    "/api/education/items",
    { method: "POST", body: JSON.stringify(input) }
  );
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

/** Delete an education item (teacher/admin or uploader). */
export async function deleteEducationItem(id: string): Promise<void> {
  await request(`/api/education/items/${id}`, { method: "DELETE" });
}