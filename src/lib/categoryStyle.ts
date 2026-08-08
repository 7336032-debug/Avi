import { NAILS_CATEGORY, FACIALS_CATEGORY } from "@/types/database";
import type { PaymentMethod } from "@/types/database";

export interface CategoryStyle {
  emoji: string;
  text: string;
  bg: string;
  border: string;
  solidBg: string;
  solidText: string;
}

const styles: Record<string, CategoryStyle> = {
  [NAILS_CATEGORY]: {
    emoji: "💅",
    text: "text-nails",
    bg: "bg-nails-bg",
    border: "border-nails",
    solidBg: "bg-nails",
    solidText: "text-white",
  },
  [FACIALS_CATEGORY]: {
    emoji: "✨",
    text: "text-facials",
    bg: "bg-facials-bg",
    border: "border-facials",
    solidBg: "bg-facials",
    solidText: "text-white",
  },
};

const fallback: CategoryStyle = {
  emoji: "💆",
  text: "text-accent-strong",
  bg: "bg-accent-soft",
  border: "border-accent",
  solidBg: "bg-accent",
  solidText: "text-accent-foreground",
};

export function getCategoryStyle(category: string): CategoryStyle {
  return styles[category] ?? fallback;
}

const treatmentEmojiRules: [string, string][] = [
  ["אקריל", "💎"],
  ["לק", "💅"],
  ["עמוק", "🧼"],
  ["פוטותרפיה", "💡"],
  ["הבהרה", "🌟"],
  ["מזותרפיה", "💉"],
  ["אלקטרופורציה", "⚡"],
  ["סרחי", "✂️"],
  ["RF", "🔥"],
];

export function getTreatmentEmoji(
  name: string | null | undefined,
  category: string,
): string {
  if (name) {
    for (const [keyword, emoji] of treatmentEmojiRules) {
      if (name.includes(keyword)) return emoji;
    }
  }
  return getCategoryStyle(category).emoji;
}

// Matches PAYMENT_METHOD_LABELS in src/types/database.ts.
export const PAYMENT_METHOD_EMOJI: Record<PaymentMethod, string> = {
  cash: "💵",
  bit: "📲",
  card: "💳",
  transfer: "🏦",
};

export type CategorySlug = "nails" | "facials";

const slugToCategory: Record<CategorySlug, string> = {
  nails: NAILS_CATEGORY,
  facials: FACIALS_CATEGORY,
};

const categoryToSlug: Record<string, CategorySlug> = {
  [NAILS_CATEGORY]: "nails",
  [FACIALS_CATEGORY]: "facials",
};

export function categoryFromSlug(slug: string): string | null {
  return slugToCategory[slug as CategorySlug] ?? null;
}

export function slugFromCategory(category: string): CategorySlug | null {
  return categoryToSlug[category] ?? null;
}
