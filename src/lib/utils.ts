import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

const currencyFormatter = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 0,
});

export function formatCurrency(amount: number) {
  return currencyFormatter.format(amount);
}

export function formatCurrencyPrecise(amount: number) {
  return new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 2,
  }).format(amount);
}

const dateFormatter = new Intl.DateTimeFormat("he-IL", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatDate(date: string | Date) {
  return dateFormatter.format(new Date(date));
}

const timeFormatter = new Intl.DateTimeFormat("he-IL", {
  hour: "2-digit",
  minute: "2-digit",
});

export function formatTime(date: string | Date) {
  return timeFormatter.format(new Date(date));
}

const weekdayFormatter = new Intl.DateTimeFormat("he-IL", { weekday: "long" });

export function formatWeekday(date: string | Date) {
  return weekdayFormatter.format(new Date(date));
}
