/**
 * Seed the SQLite database with demo accounts.
 * Run: node seed-db.mjs
 */

import { getDb, closeDb, queryOne, runSql } from "./db.mjs";
import { hashPassword } from "./auth.mjs";
import { randomUUID } from "node:crypto";

async function seed() {
  const db = await getDb();

  const existing = queryOne(db, "SELECT COUNT(*) as count FROM users");
  const seedUsers = !(existing && existing.count > 0);
  if (!seedUsers) {
    console.log(`[seed] Database already has ${existing.count} users — keeping them, seeding content only.`);
  }

  if (seedUsers) {
  console.log("[seed] Creating demo accounts...");

  const accounts = [
    {
      id: "00000000-0000-0000-0000-000000000001",
      role: "student",
      username: "amir",
      password: "Amir1404@",
      first_name: "امیر",
      last_name: "نجفی",
      father_name: "محمد",
      national_id: "0012345678",
      phone: "09121234567",
      email: "amir@meraj.school",
      grade: "یازدهم",
      class_name: "261",
      field: "ریاضی",
      academic_year: "۱۴۰۴–۱۴۰۵",
      student_number: "۴۰۳۱",
    },
    {
      id: "00000000-0000-0000-0000-000000000002",
      role: "teacher",
      username: "ahmadi",
      password: "Teacher1404@",
      first_name: "رضا",
      last_name: "احمدی",
      father_name: "—",
      national_id: "1234567890",
      phone: "09120000001",
      email: null,
      grade: "—",
      class_name: "کلاس ریاضی",
      field: "ریاضی",
      academic_year: "۱۴۰۴–۱۴۰۵",
      student_number: "۲۰۰۱",
    },
    {
      id: "00000000-0000-0000-0000-000000000003",
      role: "admin",
      username: "admin",
      password: "Admin1404@",
      first_name: "مدیر",
      last_name: "مدرسه",
      father_name: "—",
      national_id: "9999999999",
      phone: "09120000000",
      email: null,
      grade: "—",
      class_name: "دفتر مدیریت",
      field: "—",
      academic_year: "۱۴۰۴–۱۴۰۵",
      student_number: "۱۰۰۱",
    },
  ];

  for (const acc of accounts) {
    const hash = await hashPassword(acc.password);
    runSql(db,
      `INSERT INTO users (id, role, username, first_name, last_name, father_name, national_id, phone, email, grade, class_name, field, academic_year, student_number, password_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [acc.id, acc.role, acc.username, acc.first_name, acc.last_name, acc.father_name,
       acc.national_id, acc.phone, acc.email, acc.grade, acc.class_name, acc.field,
       acc.academic_year, acc.student_number, hash]
    );
    console.log(`[seed] ✓ ${acc.role}: ${acc.username} / ${acc.password}`);
  }

  // Seed a demo class session
  runSql(db,
    `INSERT INTO class_sessions (id, title, subject, grade, date_jy, date_jm, date_jd, time, duration_min, room_code, teacher_name, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')`,
    ["00000000-0000-0000-0000-000000000100",
     "حل تمرین فصل ۵ — معادله دیفرانسیل",
     "ریاضی", "یازدهم", 1404, 6, 25, "10:00", 60, "0000000", "رضا احمدی"]
  );
  console.log("[seed] ✓ Demo class session created");
  }

  // --- education items (booklets & videos per grade/classroom) ---
  const booklets = [
    { g: "10", c: "math-10", name: "فصل اول - خلاصه جزوه ریاضی.pdf", title: "خلاصه جزوه ریاضی — فصل اول", kind: "file", sizeLabel: "۲.۴ مگابایت", sizeBytes: 2516582, mime: "application/pdf" },
    { g: "10", c: "math-10", name: "آموزش حل تمرین ریاضی.mp4", title: "آموزش حل تمرین ریاضی", kind: "video", sizeLabel: "۱۵۸ مگابایت", sizeBytes: 165675008, mime: "video/mp4" },
    { g: "10", c: "physics-10", name: "جزوه فصل ۴ فیزیک - نیرو.pdf", title: "جزوه فیزیک — فصل نیرو", kind: "file", sizeLabel: "۱.۸ مگابایت", sizeBytes: 1887437, mime: "application/pdf" },
    { g: "11", c: "math-11", name: "فصل ۵ - معادلات و تابع.pdf", title: "خلاصه جزوه ریاضی — فصل ۵", kind: "file", sizeLabel: "۳.۱ مگابایت", sizeBytes: 3250586, mime: "application/pdf" },
    { g: "11", c: "math-11", name: "آموزش حل تمرین فصل ۵.mp4", title: "ویدیوی حل تمرین فصل ۵", kind: "video", sizeLabel: "۱۳۲ مگابایت", sizeBytes: 138412032, mime: "video/mp4" },
    { g: "11", c: "chemistry-11", name: "جزوه استوکیومتری.pdf", title: "جزوه استوکیومتری", kind: "file", sizeLabel: "۲.۲ مگابایت", sizeBytes: 2306867, mime: "application/pdf" },
    { g: "12", c: "physics-12", name: "جزوه مرور فیزیک دوازدهم.pdf", title: "جزوه مرور فیزیک دوازدهم", kind: "file", sizeLabel: "۴ مگابایت", sizeBytes: 4194304, mime: "application/pdf" },
    { g: "12", c: "math-12", name: "آموزش مبحث حد و پیوستگی.mp4", title: "ویدیوی حد و پیوستگی", kind: "video", sizeLabel: "۲۱۰ مگابایت", sizeBytes: 220200960, mime: "video/mp4" },
  ];
  for (const b of booklets) {
    runSql(db,
      `INSERT INTO education_items (id, grade_id, classroom_id, title, kind, name, size_label, size_bytes, mime, data_url, uploader_id, uploader_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, '00000000-0000-0000-0000-000000000002', 'رضا احمدی', datetime('now'))`,
      [randomUUID(), b.g, b.c, b.title, b.kind, b.name, b.sizeLabel, b.sizeBytes, b.mime]
    );
  }
  console.log(`[seed] ✓ ${booklets.length} education items`);

  // --- honors ---
  const honors = [
    { title: "المپیاد ریاضی", description: "کسب رتبه اول استانی در المپیاد ریاضی", badge: "طلا", badgeColor: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
    { title: "مسابقات علمی", description: "موفقیت در مسابقات علمی کشوری فیزیک", badge: "نقره", badgeColor: "bg-slate-400/15 text-slate-300 border-slate-400/30" },
    { title: "قرآن کریم", description: "حضور موفق در مسابقات اذان و قرآن", badge: "حسن انجام", badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    { title: "ورزشی", description: "قهرمانی فوتسال منطقه‌ای", badge: "نفر اول", badgeColor: "bg-aurora-500/15 text-aurora-300 border-aurora-500/30" },
    { title: "هنری", description: "حضور در جشنواره هنرهای تجسمی", badge: "تقدیر", badgeColor: "bg-pink-500/15 text-pink-400 border-pink-500/30" },
    { title: "نمونه کشوری", description: "انتخاب دانش‌آموز نمونه کشوری", badge: "ویژه", badgeColor: "bg-accent-purple/15 text-accent-purple border-accent-purple/30" },
  ];
  for (const h of honors) {
    runSql(db,
      "INSERT INTO honors (id, title, description, badge, badge_color, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))",
      [randomUUID(), h.title, h.description, h.badge, h.badgeColor]
    );
  }
  console.log(`[seed] ✓ ${honors.length} honors`);

  // --- field trips ---
  const trips = [
    { title: "اردوی علمی تهران", dateText: "آبان ۱۴۰۴", description: "بازدید از موزه علوم و فناوری و مرکز تحقیقات فیزیک ذرات", type: "علمی", typeColor: "bg-aurora-500/15 text-aurora-300 border-aurora-500/30" },
    { title: "اردوی تفریحی اصفهان", dateText: "آذر ۱۴۰۴", description: "بازدید از میدان نقش جهان، سی و سه پل و اماکن تاریخی اصفهان", type: "تفریحی", typeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    { title: "اردوی راهیان نور", dateText: "اسفند ۱۴۰۴", description: "شرکت در اردوی فرهنگی راهیان نور و بازدید از مناطق عملیاتی جنوب", type: "مذهبی", typeColor: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
    { title: "اردوی ورزشی و طبیعت‌گردی", dateText: "فروردین ۱۴۰۵", description: "پیاده‌روی و کوهنوردی در طبیعت به همراه برنامه‌های ورزشی", type: "ورزشی", typeColor: "bg-pink-500/15 text-pink-400 border-pink-500/30" },
  ];
  for (const t of trips) {
    runSql(db,
      "INSERT INTO field_trips (id, title, date_text, description, type, type_color, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))",
      [randomUUID(), t.title, t.dateText, t.description, t.type, t.typeColor]
    );
  }
  console.log(`[seed] ✓ ${trips.length} field trips`);

  // --- announcements ---
  const announcements = [
    { title: "شروع سال تحصیلی ۱۴۰۴–۱۴۰۵", body: "کلاس‌های آنلاین از شنبه ۲۵ شهریور فعال می‌شوند. لطفاً پیش از اولین جلسه، دستگاه خود را در بخش «آزمایش دستگاه» بررسی کنید." },
    { title: "ثبت‌نام اردوی علمی تهران", body: "دانش‌آموزان علاقه‌مند می‌توانند تا پایان هفته برای حضور در اردوی علمی تهران ثبت‌نام کنند. ظرفیت محدود است." },
  ];
  for (const a of announcements) {
    runSql(db,
      "INSERT INTO announcements (id, title, body, author_name, created_at) VALUES (?, ?, ?, 'مدیر مدرسه', datetime('now'))",
      [randomUUID(), a.title, a.body]
    );
  }
  console.log(`[seed] ✓ ${announcements.length} announcements`);

  // --- gallery ---
  const gallery = [
    { title: "مراسم آغاز سال تحصیلی" },
    { title: "جشنواره ورزشی مدرسه" },
    { title: "اردوی علمی دانش‌آموزان" },
    { title: "مسابقات قرآن و اذان" },
  ];
  for (const g of gallery) {
    runSql(db,
      "INSERT INTO gallery_items (id, title, img_url, created_at) VALUES (?, ?, NULL, datetime('now'))",
      [randomUUID(), g.title]
    );
  }
  console.log(`[seed] ✓ ${gallery.length} gallery items`);

  // --- today schedule ---
  const schedule = [
    { time: "۰۸:۰۰ - ۰۹:۳۰", lesson: "ریاضی ۲", room: "کلاس ۱۱/۲", teacher: "استاد احمدی", status: "passed" },
    { time: "۰۹:۴۵ - ۱۱:۱۵", lesson: "فیزیک ۲", room: "آزمایشگاه فیزیک", teacher: "استاد رضایی", status: "current" },
    { time: "۱۱:۳۰ - ۱۳:۰۰", lesson: "شیمی ۲", room: "آزمایشگاه شیمی", teacher: "استاد محمدی", status: "upcoming" },
    { time: "۱۴:۰۰ - ۱۵:۳۰", lesson: "عربی ۲", room: "کلاس ۱۱/۲", teacher: "استاد کریمی", status: "upcoming" },
    { time: "۱۵:۴۵ - ۱۷:۰۰", lesson: "زبان انگلیسی", room: "زبان‌سرا", teacher: "استاد علیزاده", status: "upcoming" },
  ];
  for (const s of schedule) {
    runSql(db,
      "INSERT INTO schedule_items (time_text, lesson, room, teacher, status) VALUES (?, ?, ?, ?, ?)",
      [s.time, s.lesson, s.room, s.teacher, s.status]
    );
  }
  console.log(`[seed] ✓ ${schedule.length} schedule items`);

  console.log("[seed] Done!");
  closeDb();
}

seed().catch((err) => {
  console.error("[seed] Error:", err);
  closeDb();
  process.exit(1);
});
