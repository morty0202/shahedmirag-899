import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { roleLabels } from "../../lib/api";
import { listNotifications, markAllNotificationsRead, type Notification } from "../../lib/api/notifications";
import { searchContent, type SearchResult } from "../../lib/api/search";
import { useNavigate } from "react-router-dom";
import { onNotificationsRefresh } from "../../lib/events";

function IconButton({
  label,
  onClick,
  children,
  iconMotion,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  iconMotion?: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`btn btn-icon ${iconMotion ?? ""}`}
    >
      {children}
    </button>
  );
}

const typeIcons: Record<string, { path: string; color: string }> = {
  announcement: {
    path: "M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0",
    color: "text-aurora-500",
  },
  field_trip: {
    path: "M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 1.657-4.03 3-9 3s-9-1.343-9-3M19.5 10.5c0-1.657-4.03-3-9-3s-9 1.343-9 3m16.5-3H3m16.5 0v6.375c0 1.125-.84 2.063-1.875 2.063H4.125C2.84 18.375 2 17.437 2 16.312V7.5m16.5 0v6.375c0 1.125.84 2.063 1.875 2.063h10.5c1.035 0 1.875-.938 1.875-2.063V7.5",
    color: "text-emerald-500",
  },
  honor: {
    path: "M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-9.75c-.622 0-1.125.504-1.125 1.125v3.375m9 0h-9",
    color: "text-amber-500",
  },
  gallery: {
    path: "M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-9-6l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159M3.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z",
    color: "text-pink-500",
  },
  education: {
    path: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25",
    color: "text-cyan-500",
  },
};

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso.replace(" ", "T") + "Z");
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "همین الان";
    if (diffMin < 60) return `${diffMin} دقیقه پیش`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} ساعت پیش`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay} روز پیش`;
    return d.toLocaleDateString("fa-IR");
  } catch {
    return iso;
  }
}

export default function TopHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const displayName = user ? `${user.firstName} ${user.lastName}` : "کاربر مهمان";
  const initials = user ? `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.trim() : "؟";
  const roleLine = user
    ? user.role === "student"
      ? `پایه ${user.grade} · ${user.field}`
      : roleLabels[user.role]
    : "";
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );
  const [openPanel, setOpenPanel] = useState<"notif" | "msg" | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotif, setLoadingNotif] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const loadNotifications = async () => {
    try {
      const data = await listNotifications();
      setNotifications(data);
    } catch {
      setNotifications([]);
    } finally {
      setLoadingNotif(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubscribe = onNotificationsRefresh(() => {
      loadNotifications();
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    setSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchContent(searchQuery);
        setSearchResults(results);
        setShowSearchResults(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }, [dark]);

  useEffect(() => {
    if (!openPanel && !showSearchResults) return;
    const onDown = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setOpenPanel(null);
        setShowSearchResults(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenPanel(null);
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openPanel, showSearchResults]);

  const handleNotifOpen = async () => {
    const next = openPanel === "notif" ? null : "notif";
    setOpenPanel(next);
    if (next === "notif") {
      await markAllNotificationsRead();
      loadNotifications();
    }
  };

  const handleNotifClick = (item: Notification) => {
    if (item.link) {
      navigate(item.link);
    }
    setOpenPanel(null);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-30 -mx-4 mb-6 px-4 pt-4 md:-mx-8 md:px-8">
      <div ref={headerRef} className="relative glass flex items-center gap-3 rounded-3xl px-3.5 py-3 md:gap-4 md:px-5">
        {/* Mobile menu button */}
        <button
          type="button"
          aria-label="باز کردن منو"
          onClick={onOpenMenu}
          className="btn btn-icon lg:hidden"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>

        {/* Search */}
        <div className="group im-search relative flex-1">
          <svg
            className="pointer-events-none absolute right-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ink3 transition-colors group-focus-within:text-aurora-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.trim() && setShowSearchResults(true)}
            placeholder="جستجو در محتوا، دانش‌آموزان و اخبار..."
            className="h-10 w-full rounded-2xl border border-line bg-card2/60 pr-11 pl-4 text-[13px] text-ink placeholder:text-ink3 outline-none transition-all duration-200 focus:border-aurora-500/50 focus:bg-card2 focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-aurora-500)_12%,transparent)]"
          />
          {showSearchResults && searchQuery.trim() && (
            <div className="pop-in glass-strong absolute top-[calc(100%+8px)] right-0 z-50 w-[360px] rounded-2xl p-2 shadow-[0_20px_50px_-20px_rgba(30,27,75,0.5)]">
              <p className="px-3 py-2 text-[11px] font-bold tracking-wide text-ink3">نتایج جستجو</p>
              {searching ? (
                <p className="px-3 py-4 text-center text-[11px] text-ink3">در حال جستجو...</p>
              ) : searchResults.length === 0 ? (
                <p className="px-3 py-4 text-center text-[11px] text-ink3">نتیجه‌ای یافت نشد</p>
              ) : (
                searchResults.map((r, i) => (
                  <div
                    key={`${r.type}-${r.id}`}
                    onClick={() => { navigate(r.link); setShowSearchResults(false); setSearchQuery(""); }}
                    className="msg-in flex cursor-pointer items-start gap-2.5 rounded-xl px-3 py-2.5 transition-colors hover:bg-aurora-500/8"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <span className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-aurora-500/10 ${typeIcons[r.type]?.color || "text-aurora-500"}`}>
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={typeIcons[r.type]?.path || typeIcons.announcement.path} />
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-bold text-ink">{r.title}</p>
                      <p className="mt-0.5 line-clamp-1 text-[11.5px] leading-5 text-ink3">{r.desc}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 md:gap-2.5">
          {/* Theme toggle */}
          <IconButton label={dark ? "حالت روشن" : "حالت تاریک"} onClick={() => setDark((v) => !v)}>
            {dark ? (
              <svg className="h-5 w-5 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
          </IconButton>

          {/* Messages */}
          <div className="relative">
            <IconButton
              label="پیام‌ها"
              iconMotion="im-send"
              onClick={() => setOpenPanel((p) => (p === "msg" ? null : "msg"))}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            </IconButton>

            {openPanel === "msg" && (
              <div className="pop-in glass-strong absolute left-0 top-[calc(100%+12px)] z-50 w-[300px] rounded-2xl p-2 shadow-[0_20px_50px_-20px_rgba(30,27,75,0.5)]">
                <p className="px-3 py-2 text-[11px] font-bold tracking-wide text-ink3">پیام‌های اخیر</p>
                <p className="px-3 py-4 text-center text-[11px] text-ink3">پیامی موجود نیست</p>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative">
            <IconButton
              label="اعلان‌ها"
              iconMotion="im-bell"
              onClick={handleNotifOpen}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="badge-ping absolute -top-1 -left-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-red-600 px-1 text-[10px] font-bold text-white shadow-lg shadow-rose-500/30">
                  {unreadCount > 9 ? "۹+" : unreadCount}
                </span>
              )}
            </IconButton>

            {openPanel === "notif" && (
              <div className="pop-in glass-strong absolute left-0 top-[calc(100%+12px)] z-50 w-[300px] rounded-2xl p-2 shadow-[0_20px_50px_-20px_rgba(30,27,75,0.5)]">
                <p className="px-3 py-2 text-[11px] font-bold tracking-wide text-ink3">اعلان‌های جدید</p>
                {loadingNotif ? (
                  <p className="px-3 py-4 text-center text-[11px] text-ink3">در حال بارگذاری...</p>
                ) : notifications.length === 0 ? (
                  <p className="px-3 py-4 text-center text-[11px] text-ink3">اعلانی وجود ندارد</p>
                ) : (
                  notifications.map((n, i) => {
                    const icon = typeIcons[n.type] || typeIcons.announcement;
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleNotifClick(n)}
                        className="msg-in flex cursor-pointer items-start gap-2.5 rounded-xl px-3 py-2.5 transition-colors hover:bg-aurora-500/8"
                        style={{ animationDelay: `${i * 60}ms` }}
                      >
                        <span className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-aurora-500/10 ${icon.color}`}>
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={icon.path} />
                          </svg>
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`truncate text-[12.5px] font-bold ${n.read ? "text-ink3" : "text-ink"}`}>{n.title}</p>
                            <span className="shrink-0 text-[10px] text-ink3">{fmtTime(n.createdAt)}</span>
                          </div>
                          <p className={`mt-0.5 line-clamp-2 text-[11.5px] leading-5 ${n.read ? "text-ink3" : "text-ink2"}`}>{n.message}</p>
                        </div>
                        {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-aurora-500" />}
                      </div>
                    );
                  })
                )}
                <button className="btn btn-ghost btn-sm mt-1 w-full">مشاهده همه اعلان‌ها</button>
              </div>
            )}
          </div>

          {/* Divider + Avatar */}
          <div className="mx-1 hidden h-8 w-px bg-line md:block" />
          <button
            type="button"
            className="press flex items-center gap-3 rounded-2xl p-1 transition-colors hover:bg-aurora-500/10"
          >
            <span className="relative">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="h-10 w-10 rounded-2xl object-cover ring-1 ring-line" />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-aurora-400 via-aurora-600 to-purple-700 text-sm font-extrabold text-white ring-1 ring-line">
                  {initials}
                </span>
              )}
            </span>
            <span className="hidden text-right xl:block">
              <span className="block text-[13px] font-bold leading-5 text-ink">{displayName}</span>
              <span className="block text-[11px] text-ink3">{roleLine}</span>
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
