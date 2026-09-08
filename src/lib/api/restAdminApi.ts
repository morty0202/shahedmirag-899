/**
 * REST adapter for Admin API — connects to the real Express backend.
 */

import type { ApiResult, Role, User } from "./types";
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

/* ---- List / Get ---- */

export async function listUsers(filter?: { role?: Role }): Promise<User[]> {
  const params = filter?.role ? `?role=${filter.role}` : "";
  return request<User[]>(`/api/admin/users${params}`);
}

export async function getUser(id: string): Promise<ApiResult<User>> {
  try {
    return await request<ApiResult<User>>(`/api/admin/users/${id}`);
  } catch {
    return { ok: false, error: "server_error" };
  }
}

/* ---- Create ---- */

export interface AdminCreateInput {
  firstName: string;
  lastName: string;
  fatherName: string;
  birthDate: { jy: number; jm: number; jd: number };
  nationalId: string;
  phone: string;
  email?: string;
  role: Role;
  username: string;
  password: string;
  grade: string;
  className: string;
  field: string;
  academicYear: string;
  studentNumber: string;
}

export async function createUser(input: AdminCreateInput): Promise<ApiResult<User>> {
  try {
    return await request<ApiResult<User>>("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(input),
    });
  } catch {
    return { ok: false, error: "server_error" };
  }
}

/* ---- Update ---- */

export interface AdminUpdatePatch {
  firstName?: string;
  lastName?: string;
  fatherName?: string;
  birthDate?: { jy: number; jm: number; jd: number };
  nationalId?: string;
  phone?: string;
  email?: string;
  role?: Role;
  grade?: string;
  className?: string;
  field?: string;
  academicYear?: string;
  studentNumber?: string;
}

export async function updateUser(id: string, patch: AdminUpdatePatch): Promise<ApiResult<User>> {
  try {
    return await request<ApiResult<User>>(`/api/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  } catch {
    return { ok: false, error: "server_error" };
  }
}

/* ---- Delete ---- */

export async function deleteUser(id: string): Promise<ApiResult<null>> {
  try {
    return await request<ApiResult<null>>(`/api/admin/users/${id}`, {
      method: "DELETE",
    });
  } catch {
    return { ok: false, error: "server_error" };
  }
}

/* ---- Reset Password ---- */

export async function resetUserPassword(id: string, newPassword: string): Promise<ApiResult<null>> {
  try {
    return await request<ApiResult<null>>(`/api/admin/users/${id}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ newPassword }),
    });
  } catch {
    return { ok: false, error: "server_error" };
  }
}
