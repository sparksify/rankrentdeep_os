"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Radar, AlertTriangle, MapPin, LineChart, Users, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/discovery", label: "Discovery", icon: Search },
  { href: "/", label: "Batch Overview", icon: LayoutGrid },
  { href: "/pipeline", label: "Research Pipeline", icon: Radar },
  { href: "/disagreements", label: "Model Disagreements", icon: AlertTriangle },
  { href: "/renters", label: "Rentability Explorer", icon: MapPin },
  { href: "/feedback", label: "Feedback Loop", icon: LineChart },
  { href: "/committee", label: "AI Committee", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border md:flex md:flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-xs font-bold text-primary-foreground">
          R
        </div>
        <span className="font-semibold tracking-tight">RankRentDeep OS</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-4 text-xs text-muted-foreground">
        Rank &amp; Rent research automation
      </div>
    </aside>
  );
}
