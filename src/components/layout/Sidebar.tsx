import { useLayoutEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { menuItems } from "../../data/dashboard";
import { useAuth } from "../../auth/AuthContext";
import { roleLabels } from "../../lib/api";

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const listRef = useRef<HTMLUListElement>(null);
  const { pathname } = useLocation();
  const [indicator, setIndicator] = useState({ top: 0, height: 0, opacity: 0 });

  // glide the accent bar to the active item
  useLayoutEffect(() => {
    const active = listRef.current?.querySelector<HTMLAnchorElement>("a.nav-active");
    if (!active || !listRef.current) {
      setIndicator((i) => ({ ...i, opacity: 0 }));
      return;
    }
    setIndicator({
      top: active.offsetTop + active.offsetHeight / 2 - 10,
      height: 20,
      opacity: 1,
    });
  }, [pathname]);

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-7">
        <img
          src="/icon.jpg"
          alt="نشان مدرسه"
          className="h-11 w-11 rounded-2xl object-cover ring-1 ring-line"
        />
        <div>
          <p className="text-[15px] font-extrabold leading-6 text-ink">مدرسه شاهد معراج</p>
          <p className="text-[11px] font-medium text-ink3">دبیرستان دوره دوم</p>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto no-scrollbar px-3 pb-4">
        <p className="px-3 pb-2 text-[10px] font-bold tracking-widest text-ink3">منوی اصلی</p>
        <ul ref={listRef} className="relative space-y-1">
          {/* sliding active indicator */}
          <span
            aria-hidden="true"
            className="absolute right-0 w-1 rounded-full bg-aurora-500 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ top: indicator.top, height: indicator.height, opacity: indicator.opacity }}
          />
          {menuItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === "/"}
                onClick={onNavigate}
                className={({ isActive }) =>
                  [
                    "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[13.5px] font-semibold transition-colors duration-200",
                    isActive
                      ? "nav-active text-aurora-600 dark:text-aurora-300"
                      : "text-ink2 hover:bg-aurora-500/8 hover:text-ink",
                  ].join(" ")
                }
              >
                {({ isActive }) => (
                  <>
                    <svg
                      className={`h-5 w-5 shrink-0 transition-all duration-200 group-hover:-translate-y-0.5 ${
                        isActive
                          ? "text-aurora-600 dark:text-aurora-300"
                          : "text-ink3 group-hover:text-aurora-500"
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.7}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.d} />
                    </svg>
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom — student mini card */}
      <NavLink to="/profile" className="group mx-3 mb-4 block rounded-2xl border border-line bg-aurora-500/5 p-3.5 transition-colors hover:border-aurora-500/30">
        <MiniProfile />
      </NavLink>
    </div>
  );
}

function MiniProfile() {
  const { user } = useAuth();
  if (!user) return null;
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.trim() || "؟";
  return (
    <div className="flex items-center gap-3">
      {user.avatar ? (
        <img src={user.avatar} alt="" className="h-10 w-10 rounded-xl object-cover" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-aurora-400 to-aurora-700 text-sm font-extrabold text-white">
          {initials}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-[13px] font-bold text-ink">
          {user.firstName} {user.lastName}
        </p>
        <p className="text-[11px] text-ink3">
          {user.role === "student" ? `پایه ${user.grade} · ${user.field}` : roleLabels[user.role]}
        </p>
      </div>
    </div>
  );
}

export default function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {/* Desktop floating sidebar (right side in RTL) */}
      <aside className="fixed inset-y-4 right-4 z-40 hidden w-[264px] rounded-[28px] glass-strong lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-opacity duration-300 ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <aside
          className={`absolute inset-y-0 right-0 w-[280px] glass-strong transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            mobileOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <SidebarContent onNavigate={onClose} />
        </aside>
      </div>
    </>
  );
}
