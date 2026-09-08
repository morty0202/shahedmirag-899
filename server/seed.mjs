/**
 * Seeds / manages server users (users.json next to this script).
 *
 *   node seed.mjs                          → creates the three demo accounts
 *   node seed.mjs <user> <pass> <role> <name>
 */
import { randomUUID } from "node:crypto";
import { hashPassword, loadUsers, saveUsers } from "./auth.mjs";

const demo = [
  { username: "amir", password: "Amir1404@", role: "student", name: "امیر نجفی" },
  { username: "ahmadi", password: "Teacher1404@", role: "teacher", name: "رضا احمدی" },
  { username: "admin", password: "Admin1404@", role: "admin", name: "مدیر مدرسه" },
];

const users = loadUsers();
const [username, password, role, name] = process.argv.slice(2);

if (username && password) {
  users[username.toLowerCase()] = {
    userId: users[username.toLowerCase()]?.userId ?? randomUUID(),
    name: name ?? username,
    role: ["student", "teacher", "admin"].includes(role) ? role : "student",
    hash: hashPassword(password),
  };
  console.log(`✓ user '${username}' saved`);
} else {
  for (const u of demo) {
    if (!users[u.username]) {
      users[u.username] = { userId: randomUUID(), name: u.name, role: u.role, hash: hashPassword(u.password) };
      console.log(`✓ demo user '${u.username}' (${u.role})`);
    } else {
      console.log(`- demo user '${u.username}' already exists`);
    }
  }
}

saveUsers(users);
console.log(`users.json now has ${Object.keys(users).length} account(s)`);
