import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import type { ApiError, RegisterInput, Session, User } from "../lib/api";
import { fetchSignalTicket } from "../lib/realtime/signalAuth";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string, remember: boolean) => Promise<{ ok: boolean; error?: ApiError }>;
  register: (input: RegisterInput) => Promise<{ ok: boolean; error?: ApiError }>;
  logout: () => Promise<void>;
  refreshUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_LOCAL_KEY = "sm_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // restore session on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = localStorage.getItem(SESSION_LOCAL_KEY);
      if (token) {
        const restored = await api.getSession(token);
        if (!cancelled && restored) {
          setSession(restored);
          setUser(restored.user);
        } else if (!cancelled) {
          localStorage.removeItem(SESSION_LOCAL_KEY);
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string, remember: boolean) => {
    const result = await api.login(username, password, remember);
    if (result.ok) {
      localStorage.setItem(SESSION_LOCAL_KEY, result.data.token);
      setSession(result.data);
      setUser(result.data.user);
      // best-effort: classroom server verifies the same credentials itself
      void fetchSignalTicket(username, password);
      return { ok: true };
    }
    return { ok: false, error: result.error };
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const result = await api.register(input);
    if (result.ok) {
      localStorage.setItem(SESSION_LOCAL_KEY, result.data.token);
      setSession(result.data);
      setUser(result.data.user);
      return { ok: true };
    }
    return { ok: false, error: result.error };
  }, []);

  const logout = useCallback(async () => {
    if (session) await api.logout(session.token);
    localStorage.removeItem(SESSION_LOCAL_KEY);
    setSession(null);
    setUser(null);
  }, [session]);

  const refreshUser = useCallback((next: User) => {
    setUser(next);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refreshUser }),
    [user, loading, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
