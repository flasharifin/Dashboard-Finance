"use client";

import { usePortfolio } from "@/hooks/use-portfolio";
import { useDividends } from "@/hooks/use-dividends";
import { useNetWorth } from "@/hooks/use-networth";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";
import { TrendingUp, Banknote, Wallet, TrendingDown, Target, Pencil, Check, X, ArrowUp, ArrowDown, Minus } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import type { PortfolioWithCalc } from "@/types";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const EXCHANGE_BADGE: Record<string, string> = {
  IDX: "bg-blue-100 text-blue-700",
  US: "bg-violet-100 text-violet-700",
  CRYPTO: "bg-amber-100 text-amber-700",
};

const PIE_COLORS: Record<string, string> = {
  IDX: "#3b82f6",
  US: "#8b5cf6",
  CRYPTO: "#f59e0b",
};

const DEFAULT_TARGET = 100_000_000;
const TARGET_KEY = "wealth-target";

export default function DashboardPage() {
  const { data: portfolios, isLoading: portfolioLoading } = usePortfolio();
  const { data: dividends, isLoading: dividendLoading } = useDividends();
  const { data: networth, isLoading: networthLoading } = useNetWorth();
  const { data: rateData } = useExchangeRate();
  const usdToIdr = rateData?.USDIDR ?? 16000;

  const [target, setTarget] = useState(DEFAULT_TARGET);
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState("");

  // Baca target dari localStorage (setelah mount agar SSR aman)
  useEffect(() => {
    const saved = localStorage.getItem(TARGET_KEY);
    if (saved) setTarget(Number(saved));
  }, []);

  function saveTarget() {
    const val = Number(targetInput.replace(/\D/g, ""));
    if (val > 0) {
      setTarget(val);
      localStorage.setItem(TARGET_KEY, String(val));
    }
    setEditingTarget(false);
  }

  function startEdit() {
    setTargetInput(String(target));
    setEditingTarget(true);
  }

  // ── Portfolio calculations ──────────────────────────────────────
  const portfolioValueIDR = portfolios
    ? portfolios.reduce((s: number, p: PortfolioWithCalc) => {
        const val = p.marketValue ?? p.totalCost;
        return s + (p.currency === "IDR" ? val : val * usdToIdr);
      }, 0)
    : 0;

  const portfolioSummary = portfolios
    ? {
        totalCostIDR: portfolios.reduce(
          (s, p) => s + (p.currency === "IDR" ? p.totalCost : p.totalCost * usdToIdr),
          0
        ),
        unrealizedPnl: portfolios.reduce(
          (s, p) => s + (p.unrealizedPnl ?? 0) * (p.currency === "IDR" ? 1 : usdToIdr),
          0
        ),
        count: portfolios.length,
      }
    : null;

  const unrealizedPnlPct =
    portfolioSummary && portfolioSummary.totalCostIDR > 0
      ? (portfolioSummary.unrealizedPnl / portfolioSummary.totalCostIDR) * 100
      : 0;

  // Pie chart: nilai porto per exchange dalam IDR
  const pieData = portfolios
    ? Object.entries(
        portfolios.reduce((acc: Record<string, number>, p: PortfolioWithCalc) => {
          const val = p.marketValue ?? p.totalCost;
          const valIDR = p.currency === "IDR" ? val : val * usdToIdr;
          acc[p.exchange] = (acc[p.exchange] ?? 0) + valIDR;
          return acc;
        }, {})
      )
        .map(([name, value]) => ({ name, value }))
        .filter((d) => d.value > 0)
    : [];

  const totalPieValue = pieData.reduce((s, d) => s + d.value, 0);

  // ── Daily P&L ──────────────────────────────────────────────────
  const dailyRows = portfolios
    ? portfolios
        .filter((p: PortfolioWithCalc) => p.dailyChange !== null)
        .map((p: PortfolioWithCalc) => ({
          ...p,
          dailyChangeIDR:
            (p.dailyChange ?? 0) * (p.currency === "IDR" ? 1 : usdToIdr),
        }))
        .sort((a, b) => Math.abs(b.dailyChangeIDR) - Math.abs(a.dailyChangeIDR))
    : [];

  const totalDailyChangeIDR = dailyRows.reduce((s, r) => s + r.dailyChangeIDR, 0);
  const totalPortfolioValueIDR = portfolios
    ? portfolios.reduce((s: number, p: PortfolioWithCalc) => {
        const val = p.marketValue ?? p.totalCost;
        return s + (p.currency === "IDR" ? val : val * usdToIdr);
      }, 0)
    : 0;
  const totalDailyChangePct =
    totalPortfolioValueIDR > 0
      ? (totalDailyChangeIDR / (totalPortfolioValueIDR - totalDailyChangeIDR)) * 100
      : 0;

  // ── Net Worth calculations ──────────────────────────────────────
  const currentYear = new Date().getFullYear();
  const totalDividendThisYear = dividends
    ? dividends
        .filter(
          (d: { paymentDate: string | null }) =>
            d.paymentDate && new Date(d.paymentDate).getFullYear() === currentYear
        )
        .reduce(
          (s: number, d: { receivedAmount: string | number | null }) =>
            s + Number(d.receivedAmount ?? 0),
          0
        )
    : 0;

  const manualAssetsTotal = networth?.totalAssets ?? 0;
  const totalLiabilities = networth?.totalLiabilities ?? 0;
  const totalAssetsAll = portfolioValueIDR + manualAssetsTotal;
  const combinedNetWorth = totalAssetsAll - totalLiabilities;

  const targetProgress = Math.min((combinedNetWorth / target) * 100, 100);
  const targetRemaining = Math.max(target - combinedNetWorth, 0);

  const isLoading = networthLoading || portfolioLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Ringkasan portofolio dan keuangan Anda</p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Modal (IDR)"
          value={portfolioSummary ? formatCurrency(portfolioSummary.totalCostIDR, "IDR") : null}
          sub={`${portfolioSummary?.count ?? 0} posisi aktif`}
          icon={<Wallet className="h-4 w-4" />}
          loading={portfolioLoading}
          href="/portfolio"
        />
        <SummaryCard
          title="Unrealized P&L"
          value={portfolioSummary ? formatCurrency(portfolioSummary.unrealizedPnl, "IDR") : null}
          sub={portfolioSummary ? formatPercent(unrealizedPnlPct) : null}
          icon={
            unrealizedPnlPct >= 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )
          }
          valueClass={unrealizedPnlPct >= 0 ? "text-emerald-600" : "text-red-600"}
          loading={portfolioLoading}
          href="/portfolio"
        />
        <SummaryCard
          title={`Dividen ${currentYear}`}
          value={formatCurrency(totalDividendThisYear, "IDR")}
          sub="total diterima tahun ini"
          icon={<Banknote className="h-4 w-4" />}
          loading={dividendLoading}
          href="/dividends"
        />
        <SummaryCard
          title="Net Worth"
          value={networth ? formatCurrency(combinedNetWorth, "IDR") : null}
          sub={
            networth
              ? `Aset: ${formatCurrency(totalAssetsAll, "IDR")} · Hutang: ${formatCurrency(totalLiabilities, "IDR")}`
              : null
          }
          icon={<Wallet className="h-4 w-4" />}
          valueClass={combinedNetWorth >= 0 ? "" : "text-red-600"}
          loading={isLoading}
          href="/networth"
        />
      </div>

      {/* Daily P&L */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              {totalDailyChangeIDR >= 0 ? (
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
              Perubahan Hari Ini
            </CardTitle>
            {!portfolioLoading && dailyRows.length > 0 && (
              <div className={cn(
                "flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold",
                totalDailyChangeIDR > 0
                  ? "bg-emerald-50 text-emerald-700"
                  : totalDailyChangeIDR < 0
                  ? "bg-red-50 text-red-700"
                  : "bg-muted text-muted-foreground"
              )}>
                {totalDailyChangeIDR > 0 ? (
                  <ArrowUp className="h-3.5 w-3.5" />
                ) : totalDailyChangeIDR < 0 ? (
                  <ArrowDown className="h-3.5 w-3.5" />
                ) : (
                  <Minus className="h-3.5 w-3.5" />
                )}
                {formatPercent(Math.abs(totalDailyChangePct))}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {portfolioLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : dailyRows.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Data harga pasar belum tersedia.
            </p>
          ) : (
            <div className="space-y-2">
              {/* Total baris */}
              <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2.5">
                <span className="text-sm font-semibold">Total Portfolio</span>
                <div className="text-right">
                  <p className={cn(
                    "text-lg font-bold",
                    totalDailyChangeIDR > 0 ? "text-emerald-600" : totalDailyChangeIDR < 0 ? "text-red-600" : ""
                  )}>
                    {totalDailyChangeIDR >= 0 ? "+" : ""}
                    {formatCurrency(totalDailyChangeIDR)}
                  </p>
                  <p className={cn(
                    "text-xs",
                    totalDailyChangeIDR > 0 ? "text-emerald-600" : totalDailyChangeIDR < 0 ? "text-red-600" : "text-muted-foreground"
                  )}>
                    {totalDailyChangePct >= 0 ? "+" : ""}
                    {totalDailyChangePct.toFixed(2)}%
                  </p>
                </div>
              </div>

              {/* Per-aset breakdown */}
              <div className="divide-y">
                {dailyRows.map((r) => {
                  const isUp = r.dailyChangeIDR > 0;
                  const isDown = r.dailyChangeIDR < 0;
                  return (
                    <div key={r.id} className="flex items-center justify-between py-2 px-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge
                          variant="outline"
                          className={cn("shrink-0 text-xs px-1.5 py-0", EXCHANGE_BADGE[r.exchange])}
                        >
                          {r.exchange}
                        </Badge>
                        <div className="min-w-0">
                          <span className="text-sm font-medium">{r.stockCode}</span>
                          {r.platform && (
                            <span className="ml-1 text-xs text-muted-foreground">({r.platform})</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 pl-3">
                        <p className={cn(
                          "text-sm font-semibold",
                          isUp ? "text-emerald-600" : isDown ? "text-red-600" : "text-muted-foreground"
                        )}>
                          {isUp ? "+" : ""}
                          {formatCurrency(r.dailyChangeIDR)}
                        </p>
                        <p className={cn(
                          "text-xs",
                          isUp ? "text-emerald-600" : isDown ? "text-red-600" : "text-muted-foreground"
                        )}>
                          {(r.dailyChangePercent ?? 0) >= 0 ? "+" : ""}
                          {(r.dailyChangePercent ?? 0).toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Target Goal */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-5 w-5 text-primary" />
              {editingTarget ? (
                <span>Set Target Goal</span>
              ) : (
                <Link href="/networth" className="hover:underline">
                  Target {formatCurrency(target)}
                </Link>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {editingTarget ? (
                <>
                  <Input
                    type="number"
                    className="h-8 w-44 text-sm"
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveTarget(); if (e.key === "Escape") setEditingTarget(false); }}
                    autoFocus
                    placeholder="100000000"
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={saveTarget}>
                    <Check className="h-4 w-4 text-emerald-600" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingTarget(false)}>
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </>
              ) : (
                <>
                  {!isLoading && (
                    <span className="text-sm font-semibold text-primary">
                      {targetProgress.toFixed(1)}%
                    </span>
                  )}
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={startEdit}>
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <Skeleton className="h-14 w-full" />
          ) : (
            <>
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700",
                    targetProgress >= 100
                      ? "bg-emerald-500"
                      : targetProgress >= 75
                      ? "bg-blue-500"
                      : targetProgress >= 50
                      ? "bg-violet-500"
                      : targetProgress >= 25
                      ? "bg-amber-500"
                      : "bg-rose-400"
                  )}
                  style={{ width: `${targetProgress}%` }}
                />
              </div>
              <div className="flex items-end justify-between text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Net Worth saat ini</p>
                  <p className="text-lg font-bold">{formatCurrency(combinedNetWorth)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Porto: {formatCurrency(portfolioValueIDR)} + Manual: {formatCurrency(manualAssetsTotal)} − Hutang: {formatCurrency(totalLiabilities)}
                  </p>
                </div>
                <div className="text-right">
                  {targetProgress >= 100 ? (
                    <p className="text-emerald-600 font-semibold">🎉 Target tercapai!</p>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground">Sisa menuju target</p>
                      <p className="font-semibold text-muted-foreground">{formatCurrency(targetRemaining)}</p>
                    </>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Target: {formatCurrency(target)}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Bottom section */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Pie chart: komposisi portfolio */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Komposisi Portfolio</CardTitle>
          </CardHeader>
          <CardContent>
            {portfolioLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : pieData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Belum ada posisi.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={PIE_COLORS[entry.name] ?? "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value)), ""]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Legend
                    formatter={(value) => {
                      const entry = pieData.find((d) => d.name === value);
                      const pct = entry && totalPieValue > 0
                        ? ((entry.value / totalPieValue) * 100).toFixed(1)
                        : "0";
                      return `${value} ${pct}%`;
                    }}
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Posisi terbaik */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Posisi Terbaik</CardTitle>
          </CardHeader>
          <CardContent>
            {portfolioLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="space-y-2">
                {portfolios
                  ?.sort((a, b) => (b.unrealizedPnlPct ?? 0) - (a.unrealizedPnlPct ?? 0))
                  .slice(0, 5)
                  .map((p: PortfolioWithCalc) => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn("text-xs px-1.5 py-0", EXCHANGE_BADGE[p.exchange])}
                        >
                          {p.exchange}
                        </Badge>
                        <div>
                          <span className="font-medium">{p.stockCode}</span>
                          {p.platform && (
                            <span className="ml-1 text-xs text-muted-foreground">({p.platform})</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={cn((p.unrealizedPnlPct ?? 0) >= 0 ? "text-emerald-600" : "text-red-600")}>
                          {p.unrealizedPnlPct !== null ? formatPercent(p.unrealizedPnlPct) : "—"}
                        </span>
                        {p.marketPrice && (
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(p.marketPrice, p.currency)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                {(portfolios?.length ?? 0) === 0 && (
                  <p className="text-muted-foreground text-sm">Belum ada posisi.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dividen terakhir */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dividen Terakhir</CardTitle>
          </CardHeader>
          <CardContent>
            {dividendLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="space-y-2">
                {(dividends ?? [])
                  .slice(0, 5)
                  .map(
                    (d: {
                      id: string;
                      stockCode: string;
                      receivedAmount: number | string | null;
                      paymentDate: string | null;
                    }) => (
                      <div key={d.id} className="flex items-center justify-between text-sm">
                        <span className="font-medium">{d.stockCode}</span>
                        <div className="text-right">
                          <p className="text-emerald-600">
                            {formatCurrency(Number(d.receivedAmount ?? 0), "IDR")}
                          </p>
                          {d.paymentDate && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(d.paymentDate).toLocaleDateString("id-ID")}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  )}
                {(dividends ?? []).length === 0 && (
                  <p className="text-muted-foreground text-sm">Belum ada data dividen.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  sub,
  icon,
  loading,
  href,
  valueClass = "",
}: {
  title: string;
  value: string | null;
  sub: string | null;
  icon: React.ReactNode;
  loading: boolean;
  href: string;
  valueClass?: string;
}) {
  return (
    <Link href={href}>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <>
              <p className={cn("text-xl font-bold", valueClass)}>{value ?? "—"}</p>
              {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
            </>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
