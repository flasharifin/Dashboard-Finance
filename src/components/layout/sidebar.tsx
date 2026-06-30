"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  CalendarClock,
  Banknote,
  Wallet,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portfolio", label: "Portfolio", icon: TrendingUp },
  { href: "/dca", label: "DCA", icon: CalendarClock },
  { href: "/dividends", label: "Dividen", icon: Banknote },
  { href: "/networth", label: "Net Worth", icon: Wallet },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside className="hidden md:flex h-screen w-60 flex-col border-r bg-background px-3 py-4">
        <div className="mb-6 px-2">
          <h1 className="text-lg font-bold tracking-tight">Dashboard Assets</h1>
          <p className="text-xs text-muted-foreground">Personal Finance Tracker</p>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive(href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          Keluar
        </button>
      </aside>

      {/* ── Mobile top header ───────────────────────────────── */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between border-b bg-background px-4 h-14">
        <div>
          <h1 className="text-base font-bold tracking-tight leading-none">Dashboard Assets</h1>
          <p className="text-[10px] text-muted-foreground">Personal Finance Tracker</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted"
        >
          <LogOut className="h-3.5 w-3.5" />
          Keluar
        </button>
      </header>

      {/* ── Mobile bottom navigation ─────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex border-t bg-background">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors",
              isActive(href)
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className={cn("h-5 w-5", isActive(href) && "stroke-[2.5]")} />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
