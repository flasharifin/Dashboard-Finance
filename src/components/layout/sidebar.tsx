"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  CalendarClock,
  Banknote,
  Wallet,
  BarChart3,
  LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard",  mobileLabel: "Dashboard", icon: LayoutDashboard },
  { href: "/portfolio", label: "Portfolio",  mobileLabel: "Portfolio",  icon: TrendingUp },
  { href: "/dca",       label: "DCA",        mobileLabel: "DCA",        icon: CalendarClock },
  { href: "/dividends", label: "Dividen",    mobileLabel: "Dividen",    icon: Banknote },
  { href: "/networth",  label: "Net Worth",  mobileLabel: "Networth",   icon: Wallet },
  { href: "/analisis",  label: "Analisis",   mobileLabel: "Analisis",   icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside className="hidden md:flex h-screen w-60 flex-col border-r bg-background">
        {/* Logo */}
        <div className="px-5 py-5 border-b">
          <h1 className="text-base font-bold tracking-tight">Dashboard Assets</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">Personal Finance Tracker</p>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-0.5 px-3 py-3">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", active && "drop-shadow-sm")} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-3 border-t">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Keluar
          </button>
        </div>
      </aside>

      {/* ── Mobile top header ───────────────────────────────── */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between border-b bg-background/95 backdrop-blur px-4 h-14">
        <div>
          <h1 className="text-base font-bold tracking-tight leading-none">Dashboard Assets</h1>
          <p className="text-[10px] text-muted-foreground">Personal Finance Tracker</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Keluar
        </button>
      </header>

      {/* ── Mobile bottom navigation ─────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex border-t bg-background/95 backdrop-blur safe-area-pb">
        {navItems.map(({ href, mobileLabel, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon
                className={cn(
                  "h-[22px] w-[22px] transition-transform",
                  active && "stroke-[2.5] scale-110"
                )}
              />
              <span className={cn(
                "text-[10px] font-medium leading-none",
                active && "font-semibold"
              )}>
                {mobileLabel}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
