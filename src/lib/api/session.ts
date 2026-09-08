/**
 * Central token storage shared by all REST adapters.
 *
 * AuthContext writes the JWT to "sm_token"; legacy mock sessions lived in
 * "sm_session_v1". Reading both keeps admin/classroom REST calls working
 * whatever the UI has stored.
 */

const SESSION_LOCAL_KEY = "sm_token";
const LEGACY_SESSION_KEY = "sm_session_v1";

export function getAuthToken(): string | null {
  try {
    const direct = localStorage.getItem(SESSION_LOCAL_KEY);
    if (direct) return direct;
    const legacy = localStorage.getItem(LEGACY_SESSION_KEY);
    if (!legacy) return null;
    const parsed = JSON.parse(legacy);
    return typeof parsed?.token === "string" ? parsed.token : null;
  } catch {
    return null;
  }
}