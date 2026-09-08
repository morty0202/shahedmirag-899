import { useEffect, useState, useMemo, useCallback } from "react";
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  type AdminCreateInput,
  type AdminUpdatePatch,
} from "../../lib/api/restAdminApi";
import { roleLabels, errorMessages, type Role, type User } from "../../lib/api";
import { toFa } from "../../utils/fa";
import { passwordStrength } from "../../lib/validation";
import Alert from "../../components/ui/Alert";
import Field from "../../components/ui/Field";
import SubmitButton from "../../components/ui/SubmitButton";
import PasswordField from "../../components/ui/PasswordField";
import PasswordMeter from "../../components/ui/PasswordMeter";

/* ---- Modal wrapper ---- */
function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative glass-strong w-full max-w-2xl rounded-3xl p-6 anim-fade-up max-h-[90vh] overflow-y-auto">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[16px] font-black text-ink">{title}</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm h-9 w-9 !p-0">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---- Confirm dialog ---- */
function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  loading,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative glass-strong w-full max-w-md rounded-3xl p-6 anim-fade-up">
        <h2 className="mb-2 text-[16px] font-black text-ink">{title}</h2>
        <p className="mb-5 text-[13px] leading-6 text-ink2">{message}</p>
        <div className="flex gap-3">
          <SubmitButton variant="danger" onClick={onConfirm} loading={loading} className="!w-auto px-6">
            تأیید
          </SubmitButton>
          <button onClick={onCancel} className="btn btn-ghost">
            انصراف
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- Role badge ---- */
function RoleBadge({ role }: { role: Role }) {
  const cls =
    role === "admin"
      ? "bg-aurora-500/10 text-aurora-500"
      : role === "teacher"
        ? "bg-emerald-500/10 text-emerald-500"
        : "bg-violet-500/10 text-violet-500";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cls}`}>
      {roleLabels[role]}
    </span>
  );
}

/* ---- Main component ---- */
export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");

  /* modals */
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  /* form states — add */
  const [addForm, setAddForm] = useState<AdminCreateInput>({
    firstName: "",
    lastName: "",
    fatherName: "",
    birthDate: { jy: 1388, jm: 1, jd: 1 },
    nationalId: "",
    phone: "",
    role: "student",
    username: "",
    password: "",
    grade: "یازدهم",
    className: "",
    field: "ریاضی",
    academicYear: "۱۴۰۴–۱۴۰۵",
    studentNumber: "",
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addMsg, setAddMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  /* form states — edit */
  const [editForm, setEditForm] = useState<AdminUpdatePatch>({});
  const [editLoading, setEditLoading] = useState(false);
  const [editMsg, setEditMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  /* form states — reset password */
  const [resetPw, setResetPw] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  /* form states — delete */
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const data = await listUsers();
    setUsers(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  /* filtered list */
  const filtered = useMemo(() => {
    let list = users;
    if (roleFilter) list = list.filter((u) => u.role === roleFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (u) =>
          u.firstName.toLowerCase().includes(q) ||
          u.lastName.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          u.phone.includes(q)
      );
    }
    return list;
  }, [users, search, roleFilter]);

  /* ---- Handlers ---- */

  const handleAdd = async () => {
    if (!addForm.firstName || !addForm.lastName || !addForm.username || !addForm.password) {
      setAddMsg({ type: "error", text: "لطفاً فیلدهای الزامی (*) را پر کنید" });
      return;
    }
    setAddLoading(true);
    setAddMsg(null);
    const result = await createUser(addForm);
    setAddLoading(false);
    if (result.ok) {
      setAddMsg({ type: "success", text: "کاربر جدید با موفقیت ایجاد شد" });
      setAddForm({
        firstName: "", lastName: "", fatherName: "",
        birthDate: { jy: 1388, jm: 1, jd: 1 }, nationalId: "", phone: "",
        role: "student", username: "", password: "", grade: "یازدهم",
        className: "", field: "ریاضی", academicYear: "۱۴۰۴–۱۴۰۵", studentNumber: "",
      });
      loadUsers();
    } else {
      setAddMsg({ type: "error", text: errorMessages[result.error] });
    }
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setEditForm({
      firstName: u.firstName,
      lastName: u.lastName,
      fatherName: u.fatherName,
      phone: u.phone,
      email: u.email,
      role: u.role,
      grade: u.grade,
      className: u.className,
      field: u.field,
      academicYear: u.academicYear,
      studentNumber: u.studentNumber,
    });
    setEditMsg(null);
  };

  const handleEdit = async () => {
    if (!editUser) return;
    setEditLoading(true);
    setEditMsg(null);
    const result = await updateUser(editUser.id, editForm);
    setEditLoading(false);
    if (result.ok) {
      setEditMsg({ type: "success", text: "اطلاعات کاربر با موفقیت بروزرسانی شد" });
      loadUsers();
    } else {
      setEditMsg({ type: "error", text: errorMessages[result.error] });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const result = await deleteUser(deleteTarget.id);
    setDeleteLoading(false);
    if (result.ok) {
      setDeleteTarget(null);
      loadUsers();
    } else {
      setDeleteTarget(null);
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    if (passwordStrength(resetPw).score < 3) {
      setResetMsg({ type: "error", text: "رمز عبور به اندازه کافی قوی نیست" });
      return;
    }
    setResetLoading(true);
    setResetMsg(null);
    const result = await resetUserPassword(resetTarget.id, resetPw);
    setResetLoading(false);
    if (result.ok) {
      setResetMsg({ type: "success", text: "رمز عبور با موفقیت تغییر کرد" });
      setTimeout(() => { setResetTarget(null); setResetPw(""); setResetMsg(null); }, 1500);
    } else {
      setResetMsg({ type: "error", text: errorMessages[result.error] });
    }
  };

  /* ---- Render ---- */
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* header */}
      <section className="anim-fade-up flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[20px] font-black text-ink">مدیریت کاربران</h1>
          <p className="mt-0.5 text-[13px] text-ink3">
            {toFa(users.length)} کاربر ثبت‌نام شده
          </p>
        </div>
        <button onClick={() => { setAddOpen(true); setAddMsg(null); }} className="btn btn-primary btn-sm gap-2">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          افزودن کاربر
        </button>
      </section>

      {/* filters */}
      <section className="anim-fade-up glass rounded-2xl p-4" style={{ animationDelay: "60ms" }}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <svg className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              placeholder="جستجو بر اساس نام، نام کاربری یا تلفن..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-xl border border-line bg-card2/60 pr-10 pl-4 text-[13px] text-ink outline-none focus:border-aurora-500/50"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as Role | "")}
            className="h-10 rounded-xl border border-line bg-card2/60 px-4 text-[13px] text-ink outline-none focus:border-aurora-500/50"
          >
            <option value="">همه نقش‌ها</option>
            <option value="student">دانش‌آموزان</option>
            <option value="teacher">معلمان</option>
            <option value="admin">مدیران</option>
          </select>
        </div>
      </section>

      {/* users table */}
      <section className="anim-fade-up glass rounded-2xl p-5" style={{ animationDelay: "120ms" }}>
        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-aurora-500 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <svg className="mx-auto mb-3 h-12 w-12 text-ink3/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            <p className="text-[13px] text-ink3">
              {search || roleFilter ? "کاربری با این مشخصات یافت نشد" : "هنوز کاربری ثبت‌نام نکرده است"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11px] text-ink3">
                  <th className="py-2.5 text-right font-bold">نام</th>
                  <th className="py-2.5 text-right font-bold">نام کاربری</th>
                  <th className="py-2.5 text-right font-bold">نقش</th>
                  <th className="py-2.5 text-right font-bold hidden sm:table-cell">کلاس</th>
                  <th className="py-2.5 text-right font-bold hidden md:table-cell">تلفن</th>
                  <th className="py-2.5 text-right font-bold">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/50">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-aurora-500/5 transition-colors">
                    <td className="py-3">
                      <div className="flex items-center gap-2.5">
                        {u.avatar ? (
                          <img src={u.avatar} alt="" className="h-8 w-8 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-aurora-400 to-aurora-700 text-[11px] font-extrabold text-white">
                            {`${u.firstName[0] ?? ""}${u.lastName[0] ?? ""}`}
                          </div>
                        )}
                        <span className="font-bold text-ink">{u.firstName} {u.lastName}</span>
                      </div>
                    </td>
                    <td className="py-3 text-ink2" dir="ltr">{u.username}</td>
                    <td className="py-3"><RoleBadge role={u.role} /></td>
                    <td className="py-3 text-ink2 hidden sm:table-cell">{u.className}</td>
                    <td className="py-3 text-ink2 hidden md:table-cell" dir="ltr">{u.phone}</td>
                    <td className="py-3">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => openEdit(u)}
                          className="rounded-lg border border-line p-1.5 text-ink3 transition-colors hover:border-aurora-500/30 hover:text-aurora-500"
                          title="ویرایش"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => { setResetTarget(u); setResetPw(""); setResetMsg(null); }}
                          className="rounded-lg border border-line p-1.5 text-ink3 transition-colors hover:border-amber-500/30 hover:text-amber-500"
                          title="تغییر رمز عبور"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(u)}
                          className="rounded-lg border border-line p-1.5 text-ink3 transition-colors hover:border-error/30 hover:text-error"
                          title="حذف"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---- ADD MODAL ---- */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="افزودن کاربر جدید">
        {addMsg && <Alert variant={addMsg.type} className="mb-4">{addMsg.text}</Alert>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="نام" required>
            <input value={addForm.firstName} onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })} className="h-11 w-full rounded-xl border border-line bg-card2/60 px-4 text-[13px] text-ink outline-none focus:border-aurora-500/50" />
          </Field>
          <Field label="نام خانوادگی" required>
            <input value={addForm.lastName} onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })} className="h-11 w-full rounded-xl border border-line bg-card2/60 px-4 text-[13px] text-ink outline-none focus:border-aurora-500/50" />
          </Field>
          <Field label="نام پدر">
            <input value={addForm.fatherName} onChange={(e) => setAddForm({ ...addForm, fatherName: e.target.value })} className="h-11 w-full rounded-xl border border-line bg-card2/60 px-4 text-[13px] text-ink outline-none focus:border-aurora-500/50" />
          </Field>
          <Field label="کد ملی">
            <input value={addForm.nationalId} onChange={(e) => setAddForm({ ...addForm, nationalId: e.target.value })} dir="ltr" className="h-11 w-full rounded-xl border border-line bg-card2/60 px-4 text-left text-[13px] text-ink outline-none focus:border-aurora-500/50" />
          </Field>
          <Field label="نام کاربری" required>
            <input value={addForm.username} onChange={(e) => setAddForm({ ...addForm, username: e.target.value })} dir="ltr" className="h-11 w-full rounded-xl border border-line bg-card2/60 px-4 text-left text-[13px] text-ink outline-none focus:border-aurora-500/50" />
          </Field>
          <Field label="رمز عبور" required>
            <PasswordField value={addForm.password} onChange={(v) => setAddForm({ ...addForm, password: v })} autoComplete="new-password" />
          </Field>
          {addForm.password && <div className="sm:col-span-2"><PasswordMeter password={addForm.password} /></div>}
          <Field label="نقش" required>
            <select value={addForm.role} onChange={(e) => setAddForm({ ...addForm, role: e.target.value as Role })} className="h-11 w-full rounded-xl border border-line bg-card2/60 px-4 text-[13px] text-ink outline-none focus:border-aurora-500/50">
              <option value="student">دانش‌آموز</option>
              <option value="teacher">معلم</option>
              <option value="admin">مدیر مدرسه</option>
            </select>
          </Field>
          <Field label="شماره تماس">
            <input value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} dir="ltr" className="h-11 w-full rounded-xl border border-line bg-card2/60 px-4 text-left text-[13px] text-ink outline-none focus:border-aurora-500/50" />
          </Field>
          <Field label="پایه تحصیلی">
            <select value={addForm.grade} onChange={(e) => setAddForm({ ...addForm, grade: e.target.value })} className="h-11 w-full rounded-xl border border-line bg-card2/60 px-4 text-[13px] text-ink outline-none focus:border-aurora-500/50">
              <option value="دهم">دهم</option>
              <option value="یازدهم">یازدهم</option>
              <option value="دوازدهم">دوازدهم</option>
              <option value="—">—</option>
            </select>
          </Field>
          <Field label="رشته">
            <select value={addForm.field} onChange={(e) => setAddForm({ ...addForm, field: e.target.value })} className="h-11 w-full rounded-xl border border-line bg-card2/60 px-4 text-[13px] text-ink outline-none focus:border-aurora-500/50">
              <option value="ریاضی">ریاضی</option>
              <option value="تجربی">تجربی</option>
              <option value="انسانی">انسانی</option>
              <option value="—">—</option>
            </select>
          </Field>
          <Field label="کلاس">
            <input value={addForm.className} onChange={(e) => setAddForm({ ...addForm, className: e.target.value })} className="h-11 w-full rounded-xl border border-line bg-card2/60 px-4 text-[13px] text-ink outline-none focus:border-aurora-500/50" />
          </Field>
          <Field label="شماره دانش‌آموزی / کد پرسنلی">
            <input value={addForm.studentNumber} onChange={(e) => setAddForm({ ...addForm, studentNumber: e.target.value })} className="h-11 w-full rounded-xl border border-line bg-card2/60 px-4 text-[13px] text-ink outline-none focus:border-aurora-500/50" />
          </Field>
        </div>
        <div className="mt-5 flex gap-3">
          <SubmitButton loading={addLoading} onClick={handleAdd} className="!w-auto px-6">
            {addLoading ? "در حال ایجاد..." : "ایجاد کاربر"}
          </SubmitButton>
          <button onClick={() => setAddOpen(false)} className="btn btn-ghost">
            انصراف
          </button>
        </div>
      </Modal>

      {/* ---- EDIT MODAL ---- */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title={`ویرایش: ${editUser?.firstName} ${editUser?.lastName}`}>
        {editMsg && <Alert variant={editMsg.type} className="mb-4">{editMsg.text}</Alert>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="نام" required>
            <input value={editForm.firstName ?? ""} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} className="h-11 w-full rounded-xl border border-line bg-card2/60 px-4 text-[13px] text-ink outline-none focus:border-aurora-500/50" />
          </Field>
          <Field label="نام خانوادگی" required>
            <input value={editForm.lastName ?? ""} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} className="h-11 w-full rounded-xl border border-line bg-card2/60 px-4 text-[13px] text-ink outline-none focus:border-aurora-500/50" />
          </Field>
          <Field label="نام پدر">
            <input value={editForm.fatherName ?? ""} onChange={(e) => setEditForm({ ...editForm, fatherName: e.target.value })} className="h-11 w-full rounded-xl border border-line bg-card2/60 px-4 text-[13px] text-ink outline-none focus:border-aurora-500/50" />
          </Field>
          <Field label="کد ملی">
            <input value={editForm.nationalId ?? ""} onChange={(e) => setEditForm({ ...editForm, nationalId: e.target.value })} dir="ltr" className="h-11 w-full rounded-xl border border-line bg-card2/60 px-4 text-left text-[13px] text-ink outline-none focus:border-aurora-500/50" />
          </Field>
          <Field label="نقش" required>
            <select value={editForm.role ?? "student"} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as Role })} className="h-11 w-full rounded-xl border border-line bg-card2/60 px-4 text-[13px] text-ink outline-none focus:border-aurora-500/50">
              <option value="student">دانش‌آموز</option>
              <option value="teacher">معلم</option>
              <option value="admin">مدیر مدرسه</option>
            </select>
          </Field>
          <Field label="شماره تماس">
            <input value={editForm.phone ?? ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} dir="ltr" className="h-11 w-full rounded-xl border border-line bg-card2/60 px-4 text-left text-[13px] text-ink outline-none focus:border-aurora-500/50" />
          </Field>
          <Field label="ایمیل">
            <input value={editForm.email ?? ""} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} dir="ltr" className="h-11 w-full rounded-xl border border-line bg-card2/60 px-4 text-left text-[13px] text-ink outline-none focus:border-aurora-500/50" />
          </Field>
          <Field label="پایه تحصیلی">
            <select value={editForm.grade ?? "یازدهم"} onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })} className="h-11 w-full rounded-xl border border-line bg-card2/60 px-4 text-[13px] text-ink outline-none focus:border-aurora-500/50">
              <option value="دهم">دهم</option>
              <option value="یازدهم">یازدهم</option>
              <option value="دوازدهم">دوازدهم</option>
              <option value="—">—</option>
            </select>
          </Field>
          <Field label="رشته">
            <select value={editForm.field ?? "ریاضی"} onChange={(e) => setEditForm({ ...editForm, field: e.target.value })} className="h-11 w-full rounded-xl border border-line bg-card2/60 px-4 text-[13px] text-ink outline-none focus:border-aurora-500/50">
              <option value="ریاضی">ریاضی</option>
              <option value="تجربی">تجربی</option>
              <option value="انسانی">انسانی</option>
              <option value="—">—</option>
            </select>
          </Field>
          <Field label="کلاس">
            <input value={editForm.className ?? ""} onChange={(e) => setEditForm({ ...editForm, className: e.target.value })} className="h-11 w-full rounded-xl border border-line bg-card2/60 px-4 text-[13px] text-ink outline-none focus:border-aurora-500/50" />
          </Field>
          <Field label="شماره دانش‌آموزی / کد پرسنلی">
            <input value={editForm.studentNumber ?? ""} onChange={(e) => setEditForm({ ...editForm, studentNumber: e.target.value })} className="h-11 w-full rounded-xl border border-line bg-card2/60 px-4 text-[13px] text-ink outline-none focus:border-aurora-500/50" />
          </Field>
        </div>
        <div className="mt-5 flex gap-3">
          <SubmitButton loading={editLoading} onClick={handleEdit} className="!w-auto px-6">
            {editLoading ? "در حال ذخیره..." : "ذخیره تغییرات"}
          </SubmitButton>
          <button onClick={() => setEditUser(null)} className="btn btn-ghost">
            انصراف
          </button>
        </div>
      </Modal>

      {/* ---- RESET PASSWORD MODAL ---- */}
      <Modal open={!!resetTarget} onClose={() => setResetTarget(null)} title="تغییر رمز عبور">
        {resetTarget && (
          <>
            <p className="mb-4 text-[13px] text-ink2">
              رمز عبور جدید برای <span className="font-bold text-ink">{resetTarget.firstName} {resetTarget.lastName}</span> را وارد کنید:
            </p>
            {resetMsg && <Alert variant={resetMsg.type} className="mb-4">{resetMsg.text}</Alert>}
            <Field label="رمز عبور جدید" required>
              <PasswordField value={resetPw} onChange={setResetPw} autoComplete="new-password" />
            </Field>
            {resetPw && <PasswordMeter password={resetPw} />}
            <div className="mt-5 flex gap-3">
              <SubmitButton loading={resetLoading} onClick={handleResetPassword} className="!w-auto px-6">
                {resetLoading ? "در حال تغییر..." : "تغییر رمز عبور"}
              </SubmitButton>
              <button onClick={() => setResetTarget(null)} className="btn btn-ghost">
                انصراف
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* ---- DELETE CONFIRM ---- */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="حذف کاربر"
        message={`آیا از حذف کاربر «${deleteTarget?.firstName} ${deleteTarget?.lastName}» مطمئن هستید؟ این عمل قابل بازگشت نیست.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteLoading}
      />
    </div>
  );
}
