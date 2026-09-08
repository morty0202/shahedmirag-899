import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listUsers } from "../../lib/api/restAdminApi";
import { listSessions } from "../../lib/api/restClassrooms";
import { roleLabels } from "../../lib/api";
import type { User } from "../../lib/api";
import { toFa } from "../../utils/fa";

interface Stats {
  total: number;
  students: number;
  teachers: number;
  admins: number;
  sessions: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ total: 0, students: 0, teachers: 0, admins: 0, sessions: 0 });
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [users, sessions] = await Promise.all([listUsers(), listSessions()]);
      setStats({
        total: users.length,
        students: users.filter((u) => u.role === "student").length,
        teachers: users.filter((u) => u.role === "teacher").length,
        admins: users.filter((u) => u.role === "admin").length,
        sessions: sessions.length,
      });
      setRecentUsers(
        [...users].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)
      );
      setLoading(false);
    })();
  }, []);

  const statCards = [
    {
      label: "کل کاربران",
      value: stats.total,
      icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z",
      color: "from-aurora-500 to-aurora-700",
      bg: "bg-aurora-500/10",
      text: "text-aurora-500",
    },
    {
      label: "دانش‌آموزان",
      value: stats.students,
      icon: "M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5",
      color: "from-violet-500 to-purple-700",
      bg: "bg-violet-500/10",
      text: "text-violet-500",
    },
    {
      label: "معلمان",
      value: stats.teachers,
      icon: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z",
      color: "from-emerald-500 to-teal-700",
      bg: "bg-emerald-500/10",
      text: "text-emerald-500",
    },
    {
      label: "جلسات کلاس",
      value: stats.sessions,
      icon: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5",
      color: "from-amber-500 to-orange-600",
      bg: "bg-amber-500/10",
      text: "text-amber-500",
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-aurora-500 border-t-transparent" />
          <p className="text-[13px] text-ink3">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* header */}
      <section className="anim-fade-up">
        <h1 className="text-[20px] font-black text-ink">پنل مدیریت مدرسه</h1>
        <p className="mt-1 text-[13px] text-ink3">مدیریت کاربران، کلاس‌ها و آمار مدرسه شاهد معراج</p>
      </section>

      {/* stat cards */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((card, i) => (
          <div
            key={card.label}
            className="glass anim-fade-up rounded-2xl p-5"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${card.bg}`}>
              <svg className={`h-5.5 w-5.5 ${card.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                <path strokeLinecap="round" strokeLinejoin="round" d={card.icon} />
              </svg>
            </div>
            <p className="text-2xl font-black text-ink">{toFa(card.value)}</p>
            <p className="mt-0.5 text-[11.5px] text-ink3">{card.label}</p>
          </div>
        ))}
      </section>

      {/* quick actions */}
      <section className="anim-fade-up glass rounded-2xl p-5" style={{ animationDelay: "260ms" }}>
        <h2 className="mb-3 text-[15px] font-extrabold text-ink">دسترسی سریع</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/admin/users"
            className="btn btn-secondary btn-sm gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
            مدیریت کاربران
          </Link>
          <Link
            to="/classes/teach"
            className="btn btn-secondary btn-sm gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
            </svg>
            مدیریت کلاس‌ها
          </Link>
        </div>
      </section>

      {/* recent users */}
      <section className="anim-fade-up glass rounded-2xl p-5" style={{ animationDelay: "340ms" }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-extrabold text-ink">آخرین کاربران</h2>
          <Link to="/admin/users" className="text-[12px] font-bold text-aurora-500 hover:text-aurora-600">
            مشاهده همه ←
          </Link>
        </div>

        {recentUsers.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-ink3">هنوز کاربری ثبت‌نام نکرده است</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11px] text-ink3">
                  <th className="py-2.5 text-right font-bold">نام</th>
                  <th className="py-2.5 text-right font-bold">نام کاربری</th>
                  <th className="py-2.5 text-right font-bold">نقش</th>
                  <th className="py-2.5 text-right font-bold">کلاس</th>
                  <th className="py-2.5 text-right font-bold">تاریخ ثبت‌نام</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/50">
                {recentUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-aurora-500/5 transition-colors">
                    <td className="py-3 font-bold text-ink">{u.firstName} {u.lastName}</td>
                    <td className="py-3 text-ink2" dir="ltr">{u.username}</td>
                    <td className="py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        u.role === "admin" ? "bg-aurora-500/10 text-aurora-500" :
                        u.role === "teacher" ? "bg-emerald-500/10 text-emerald-500" :
                        "bg-violet-500/10 text-violet-500"
                      }`}>
                        {roleLabels[u.role]}
                      </span>
                    </td>
                    <td className="py-3 text-ink2">{u.className}</td>
                    <td className="py-3 text-ink3 text-[12px]">
                      {new Date(u.createdAt).toLocaleDateString("fa-IR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
