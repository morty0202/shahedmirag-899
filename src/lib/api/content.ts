/**
 * Content API client — announcements, honors, field trips, gallery.
 */

import { getAuthToken } from "./session";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  authorName: string;
  createdAt: string;
}

export interface Honor {
  id: string;
  title: string;
  description: string;
  badge: string;
  badgeColor: string;
  createdAt: string;
}

export interface FieldTrip {
  id: string;
  title: string;
  dateText: string;
  description: string;
  type: string;
  typeColor: string;
  createdAt: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  imgUrl?: string;
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

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

/* ---------- announcements ---------- */

export async function listAnnouncements(): Promise<Announcement[]> {
  return request<Announcement[]>("/api/announcements");
}

export async function createAnnouncement(input: { title: string; body: string }) {
  const result = await request<ApiResult<Announcement>>("/api/announcements", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return result;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await request(`/api/announcements/${id}`, { method: "DELETE" });
}

/* ---------- honors ---------- */

export async function listHonors(): Promise<Honor[]> {
  return request<Honor[]>("/api/honors");
}

export async function createHonor(input: { title: string; description: string; badge: string; badgeColor: string }) {
  const result = await request<ApiResult<Honor>>("/api/honors", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return result;
}

export async function deleteHonor(id: string): Promise<void> {
  await request(`/api/honors/${id}`, { method: "DELETE" });
}

/* ---------- field trips ---------- */

export async function listFieldTrips(): Promise<FieldTrip[]> {
  return request<FieldTrip[]>("/api/field-trips");
}

export async function createFieldTrip(input: { title: string; dateText: string; description: string; type: string; typeColor: string }) {
  const result = await request<ApiResult<FieldTrip>>("/api/field-trips", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return result;
}

export async function deleteFieldTrip(id: string): Promise<void> {
  await request(`/api/field-trips/${id}`, { method: "DELETE" });
}

/* ---------- gallery ---------- */

export async function listGalleryItems(): Promise<GalleryItem[]> {
  return request<GalleryItem[]>("/api/gallery");
}

export async function createGalleryItem(input: { title: string; imgUrl?: string }) {
  const result = await request<ApiResult<GalleryItem>>("/api/gallery", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return result;
}

export async function deleteGalleryItem(id: string): Promise<void> {
  await request(`/api/gallery/${id}`, { method: "DELETE" });
}