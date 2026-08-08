"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart3, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "דשבורד", icon: Home },
  { href: "/reports", label: "דוחות", icon: BarChart3 },
  { href: "/more", label: "עוד", icon: Menu },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border-soft bg-bg/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-lg items-center justify-around px-3 pt-2 pb-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl text-sm",
                  active ? "text-accent-strong font-semibold" : "text-text-muted",
                )}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
