import * as jalaali from "jalaali-js";

export function getJalaliDate(): string {
  const now = new Date();
  const { jy, jm, jd } = jalaali.toJalaali(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate()
  );

  const months = [
    "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
    "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
  ];

  const weekdays = [
    "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه",
  ];

  const dayOfWeek = weekdays[now.getDay()];
  const monthName = months[jm - 1];

  return `${dayOfWeek}، ${jd} ${monthName} ${jy}`;
}

export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "صبح بخیر";
  if (hour >= 12 && hour < 17) return "ظهر بخیر";
  if (hour >= 17 && hour < 21) return "عصر بخیر";
  return "شب بخیر";
}

export function getCurrentTime(): string {
  const now = new Date();
  return now.toLocaleTimeString("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
