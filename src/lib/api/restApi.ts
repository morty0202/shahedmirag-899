/**
 * REST API adapter — connects the frontend to the real Express backend.
 * Drop-in replacement for mockBackend; every screen stays untouched.
 */

import type { AuthApi, ApiError, ApiResult, RegisterInput, Session, User } from "./types";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

/** Thrown when the backend can't be reached (network-level failure). */
class ApiOfflineError extends Error {
  constructor() {
    super("server_offline");
    this.name = "ApiOfflineError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch {
    // network failure / server unreachable / CORS block
    throw new ApiOfflineError();
  }
  if (!res.ok) {
    // HTTP error (5xx etc.) — try to read the backend's own code, else generic
    try {
      const body = await res.json();
      if (typeof body?.error === "string") throw new Error(body.error);
    } catch {
      /* fall through */
    }
    throw new Error("server_error");
  }
  return res.json();
}

/** Maps any thrown error to a stable ApiError code. */
function mapError(e: unknown): ApiError {
  if (e instanceof ApiOfflineError) return "server_offline";
  return "server_error";
}

function tokenHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export const restApi: AuthApi = {
  async register(input: RegisterInput): Promise<ApiResult<Session>> {
    try {
      const result = await request<{ ok: true; data: Session } | { ok: false; error: string }>(
        "/api/auth/register",
        { method: "POST", body: JSON.stringify(input) }
      );
      return result as ApiResult<Session>;
    } catch (e) {
      return { ok: false, error: mapError(e) };
    }
  },

  async login(username: string, password: string, remember: boolean): Promise<ApiResult<Session>> {
    try {
      const result = await request<{ ok: true; data: Session } | { ok: false; error: string }>(
        "/api/auth/login",
        { method: "POST", body: JSON.stringify({ username, password, remember }) }
      );
      return result as ApiResult<Session>;
    } catch (e) {
      return { ok: false, error: mapError(e) };
    }
  },

  async logout(token: string): Promise<void> {
    try {
      await request("/api/auth/logout", {
        method: "POST",
        headers: tokenHeaders(token),
      });
    } catch {
      // ignore
    }
  },

  async getSession(token: string): Promise<Session | null> {
    try {
      const result = await request<{ session: Session | null }>("/api/auth/session", {
        headers: tokenHeaders(token),
      });
      return result.session;
    } catch {
      return null;
    }
  },

  async checkUsername(username: string): Promise<{ available: boolean }> {
    try {
      return await request<{ available: boolean }>(`/api/auth/check-username/${encodeURIComponent(username)}`);
    } catch {
      return { available: false };
    }
  },

  async requestReset(identifier: string): Promise<ApiResult<{ demoCode: string }>> {
    try {
      return await request<ApiResult<{ demoCode: string }>>("/api/auth/request-reset", {
        method: "POST",
        body: JSON.stringify({ identifier }),
      });
    } catch (e) {
      return { ok: false, error: mapError(e) };
    }
  },

  async completeReset(identifier: string, code: string, newPassword: string): Promise<ApiResult<null>> {
    try {
      return await request<ApiResult<null>>("/api/auth/complete-reset", {
        method: "POST",
        body: JSON.stringify({ identifier, code, newPassword }),
      });
    } catch (e) {
      return { ok: false, error: mapError(e) };
    }
  },

  async changePassword(userId: string, current: string, next: string): Promise<ApiResult<null>> {
    try {
      return await request<ApiResult<null>>("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ userId, current, next }),
      });
    } catch (e) {
      return { ok: false, error: mapError(e) };
    }
  },

  async updateProfile(userId: string, patch: { phone?: string; email?: string; avatar?: string }): Promise<ApiResult<User>> {
    try {
      return await request<ApiResult<User>>("/api/auth/update-profile", {
        method: "POST",
        body: JSON.stringify({ userId, patch }),
      });
    } catch (e) {
      return { ok: false, error: mapError(e) };
    }
  },
};
