/** Admin-only API — user management, statistics (localStorage-backed). */

import { hashPassword } from "../crypto";
import { passwordStrength } from "../validation";
import type { ApiResult, Role, User } from "./types";

const USERS_KEY = "sm_users_v1";

const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

interface StoredUser extends User {
  passwordHash: string;
}

function readUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]") as StoredUser[];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function publicUser(u: StoredUser): User {
  const { passwordHash: _, ...rest } = u;
  return rest;
}

/* ---- List / Get ---- */

export async function listUsers(filter?: { role?: Role }): Promise<User[]> {
  await delay();
  let users = readUsers();
  if (filter?.role) {
    users = users.filter((u) => u.role === filter.role);
  }
  return users.map(publicUser);
}

export async function getUser(id: string): Promise<ApiResult<User>> {
  await delay(100);
  const user = readUsers().find((u) => u.id === id);
  if (!user) return { ok: false, error: "not_found" };
  return { ok: true, data: publicUser(user) };
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
  await delay(400);
  const users = readUsers();

  if (users.some((u) => u.username.toLowerCase() === input.username.toLowerCase())) {
    return { ok: false, error: "username_taken" };
  }
  if (users.some((u) => u.nationalId === input.nationalId)) {
    return { ok: false, error: "national_id_taken" };
  }
  if (passwordStrength(input.password).score < 3) {
    return { ok: false, error: "weak_password" };
  }

  const user: StoredUser = {
    id: crypto.randomUUID(),
    role: input.role,
    username: input.username,
    firstName: input.firstName,
    lastName: input.lastName,
    fatherName: input.fatherName,
    birthDate: input.birthDate,
    nationalId: input.nationalId,
    phone: input.phone,
    email: input.email,
    avatar: undefined,
    grade: input.grade,
    className: input.className,
    field: input.field,
    academicYear: input.academicYear,
    studentNumber: input.studentNumber,
    createdAt: new Date().toISOString(),
    passwordHash: await hashPassword(input.password),
  };

  writeUsers([...users, user]);
  return { ok: true, data: publicUser(user) };
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
  await delay(300);
  const users = readUsers();
  const user = users.find((u) => u.id === id);
  if (!user) return { ok: false, error: "not_found" };

  if (patch.nationalId !== undefined && patch.nationalId !== user.nationalId) {
    if (users.some((u) => u.id !== id && u.nationalId === patch.nationalId)) {
      return { ok: false, error: "national_id_taken" };
    }
  }

  if (patch.firstName !== undefined) user.firstName = patch.firstName;
  if (patch.lastName !== undefined) user.lastName = patch.lastName;
  if (patch.fatherName !== undefined) user.fatherName = patch.fatherName;
  if (patch.birthDate !== undefined) user.birthDate = patch.birthDate;
  if (patch.nationalId !== undefined) user.nationalId = patch.nationalId;
  if (patch.phone !== undefined) user.phone = patch.phone;
  if (patch.email !== undefined) user.email = patch.email;
  if (patch.role !== undefined) user.role = patch.role;
  if (patch.grade !== undefined) user.grade = patch.grade;
  if (patch.className !== undefined) user.className = patch.className;
  if (patch.field !== undefined) user.field = patch.field;
  if (patch.academicYear !== undefined) user.academicYear = patch.academicYear;
  if (patch.studentNumber !== undefined) user.studentNumber = patch.studentNumber;

  writeUsers(users);
  return { ok: true, data: publicUser(user) };
}

/* ---- Delete ---- */

export async function deleteUser(id: string): Promise<ApiResult<null>> {
  await delay(250);
  const users = readUsers();
  const user = users.find((u) => u.id === id);
  if (!user) return { ok: false, error: "not_found" };
  writeUsers(users.filter((u) => u.id !== id));
  return { ok: true, data: null };
}

/* ---- Reset Password ---- */

export async function resetUserPassword(id: string, newPassword: string): Promise<ApiResult<null>> {
  await delay(300);
  const users = readUsers();
  const user = users.find((u) => u.id === id);
  if (!user) return { ok: false, error: "not_found" };
  if (passwordStrength(newPassword).score < 3) return { ok: false, error: "weak_password" };
  user.passwordHash = await hashPassword(newPassword);
  writeUsers(users);
  return { ok: true, data: null };
}
