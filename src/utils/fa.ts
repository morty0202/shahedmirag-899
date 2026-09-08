const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toFa(value: number | string): string {
  return String(value).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}
