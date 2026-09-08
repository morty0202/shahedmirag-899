import { useLocation } from "react-router-dom";
import type { ReactNode } from "react";

/** Re-mounts children per route so the entrance animation replays on navigation. */
export default function PageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}
