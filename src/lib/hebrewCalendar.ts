// Hebrew calendar date + major Jewish holidays, using the ICU hebrew
// calendar built into Node/V8 (no external dependency). Holiday coverage
// is intentionally approximate (fixed Hebrew-date ranges, Israel/single-day
// convention) — enough for a business owner to see why a week was quiet,
// not a religious-calendar engine.

export function hebrewDateLabel(date: Date): string {
  try {
    return new Intl.DateTimeFormat("he-u-ca-hebrew", {
      day: "numeric",
      month: "short",
    }).format(date);
  } catch {
    return "";
  }
}

function hebrewParts(date: Date): { day: number; month: string } {
  const parts = new Intl.DateTimeFormat("en-u-ca-hebrew", {
    day: "numeric",
    month: "long",
  }).formatToParts(date);
  const day = Number(parts.find((p) => p.type === "day")?.value ?? 0);
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  return { day, month };
}

export function hebrewHoliday(date: Date): string | null {
  const { day, month } = hebrewParts(date);
  if (month === "Tishri" && (day === 1 || day === 2)) return "🍎";
  if (month === "Tishri" && day === 10) return "🕊️";
  if (month === "Tishri" && day >= 15 && day <= 20) return "🌿";
  if (month === "Tishri" && day === 21) return "🌿";
  if (month === "Tishri" && day === 22) return "🎉";
  if (month === "Kislev" && day >= 25) return "🕎";
  if (month === "Tevet" && day <= 3) return "🕎";
  if (month === "Shevat" && day === 15) return "🌳";
  if ((month === "Adar" || month === "Adar II") && day === 14) return "🎭";
  if (month === "Nisan" && day >= 15 && day <= 21) return "🍷";
  if (month === "Iyar" && day === 5) return "🇮🇱";
  if (month === "Iyar" && day === 18) return "🔥";
  if (month === "Sivan" && day === 6) return "📜";
  if (month === "Av" && day === 9) return "🕯️";
  return null;
}
