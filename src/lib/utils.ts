import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function vnd(amount: number) {
  return `${new Intl.NumberFormat("vi-VN").format(Math.round(amount))}₫`;
}

export function formatTimeVN(iso: string | null | undefined) {
  if (!iso) return "--:--";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatDateTimeVN(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatDateVN(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

/** Ngày theo giờ Việt Nam, dạng YYYY-MM-DD */
export function vnDayKey(date: Date = new Date()) {
  const offset = 7 * 60 * 60 * 1000;
  return new Date(date.getTime() + offset).toISOString().slice(0, 10);
}

/** Khoảng thời gian UTC của một ngày Việt Nam */
export function vnDayRange(dayKey: string) {
  const start = new Date(`${dayKey}T00:00:00+07:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export function lastNDayKeys(n: number, from: Date = new Date()) {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    keys.push(vnDayKey(new Date(from.getTime() - i * 24 * 60 * 60 * 1000)));
  }
  return keys;
}

export function dayLabelVN(dayKey: string) {
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}
