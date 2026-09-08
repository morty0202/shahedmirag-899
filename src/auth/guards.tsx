import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";
import type { Role } from "../lib/api";

export function FullScreenLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5">
      <div className="relative">
        <img src="/icon.jpg" alt="" className="h-16 w-16 rounded-2xl object-cover ring-1 ring-line" />
        <span className="absolute inset-0 -z-10 animate-ping rounded-2xl bg-aurora-500/20" />
      </div>
      <p className="text-[13px] font-semibold text-ink3">در حال بارگذاری سامانه...</p>
    </div>
  );
}

/** Blocks anonymous users; optional role whitelist. */
export function RequireAuth({ roles }: { roles?: Role[] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}

/** Keeps signed-in users away from auth pages. */
export function GuestRoute() {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}

/** Inline role gate for pages already inside a protected layout. */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}
