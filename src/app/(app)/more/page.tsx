import Link from "next/link";
import { ListChecks, Target, ShoppingBag, Receipt, ChevronLeft } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { BackupSection } from "./BackupSection";

const links = [
  {
    href: "/products/new",
    label: "מכירת מוצר",
    icon: ShoppingBag,
    emoji: "🛍️",
    badge: "bg-success-bg text-success",
  },
  {
    href: "/expenses/new",
    label: "הוספת הוצאה",
    icon: Receipt,
    emoji: "🧾",
    badge: "bg-warning-bg text-warning",
  },
  {
    href: "/settings/treatments",
    label: "ניהול מחירון טיפולים",
    icon: ListChecks,
    emoji: "💅",
    badge: "bg-nails-bg text-nails",
  },
  {
    href: "/settings/expense-categories",
    label: "ניהול קטגוריות הוצאה",
    icon: Receipt,
    emoji: "🗂️",
    badge: "bg-warning-bg text-warning",
  },
  {
    href: "/settings/goal",
    label: "הגדרת יעד שבועי",
    icon: Target,
    emoji: "🎯",
    badge: "bg-gold-bg text-gold",
  },
] as const;

export default function MorePage() {
  return (
    <div className="px-4">
      <Header title="עוד ⚙️" />
      <div className="mt-4 space-y-2 pb-6">
        {links.map(({ href, label, icon: Icon, emoji, badge }) => (
          <Link
            key={href}
            href={href}
            className="card-interactive flex items-center gap-3 rounded-2xl border border-border-soft bg-surface p-4 shadow-sm shadow-black/[0.03]"
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${badge}`}
            >
              <Icon size={18} aria-hidden />
            </span>
            <span className="flex-1 text-[15px] font-medium">
              <span aria-hidden>{emoji}</span> {label}
            </span>
            <ChevronLeft size={18} className="text-text-muted" />
          </Link>
        ))}

        <div className="pt-2">
          <BackupSection />
        </div>
      </div>
    </div>
  );
}
