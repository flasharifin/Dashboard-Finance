"use client";

import { useDailyPnl, useMonthlyPnl } from "@/hooks/use-pnl";
import { formatCurrency, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

function PnlBadge({ pnl, pct }: { pnl: number; pct: number }) {
  const up   = pnl > 0;
  const zero = pnl === 0;
  const cls  = zero ? "text-muted-foreground" : up ? "text-emerald-600" : "text-red-600";
  const Icon = zero ? Minus : up ? ArrowUp : ArrowDown;
  return (
    <span className={cn("inline-flex items-center gap-0.5 font-semibold", cls)}>
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(pct).toFixed(2)}%
    </span>
  );
}

export function PnlTab() {
  const { data: daily = [], isLoading: dailyLoading } = useDailyPnl();
  const { data: monthly = [], isLoading: monthlyLoading } = useMonthlyPnl();

  // Summary: PnL bulan ini dari daily records
  const thisMonthPnl = daily.reduce((s, d) => s + Number(d.pnl), 0);
  const thisMonthPct = daily.length > 0
    ? (Number(daily[daily.length - 1].portfolioValue) - Number(daily[0].portfolioValue)) /
      Math.abs(Number(daily[0].portfolioValue)) * 100
    : 0;

  // Max drawdown 30 hari: penurunan terbesar dari puncak ke lembah
  const maxDrawdown = (() => {
    if (daily.length < 2) return null;
    let peak = Number(daily[0].portfolioValue);
    let maxDD = 0;
    for (const d of daily) {
      const val = Number(d.portfolioValue);
      if (val > peak) peak = val;
      const dd = peak > 0 ? ((val - peak) / peak) * 100 : 0;
      if (dd < maxDD) maxDD = dd;
    }
    return maxDD;
  })();

  const dailyChart = daily.map((d) => ({
    date: format(new Date(d.date), "dd/MM", { locale: idLocale }),
    pnl:  Number(d.pnl),
    pct:  Number(d.pnlPct),
  }));

  const monthlyChart = monthly.map((m) => ({
    month:    format(new Date(m.month), "MMM yy", { locale: idLocale }),
    totalPnl: Number(m.totalPnl),
    pct:      Number(m.pnlPct),
  }));

  if (dailyLoading || monthlyLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (daily.length === 0 && monthly.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        Belum ada data PnL harian. Cron akan mengisi data mulai malam ini jam 00:00 WIB.
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Summary cards */}
      {daily.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">PnL Bulan Ini</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={cn("text-2xl font-bold", thisMonthPnl >= 0 ? "text-emerald-600" : "text-red-600")}>
                {thisMonthPnl >= 0 ? "+" : ""}{formatCurrency(thisMonthPnl)}
              </p>
              <PnlBadge pnl={thisMonthPnl} pct={thisMonthPct} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Hari Profit</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-600">
                {daily.filter((d) => Number(d.pnl) > 0).length}
                <span className="text-sm font-normal text-muted-foreground"> / {daily.length} hari</span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">Nilai Porto Terakhir</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(Number(daily[daily.length - 1]?.portfolioValue ?? 0))}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                per 00:00 WIB · bukan harga real-time
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Max Drawdown card — baris kedua */}
      {maxDrawdown !== null && (
        <Card className="border-orange-200 dark:border-orange-900">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Max Drawdown 30 Hari
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <div>
                <p className={cn(
                  "text-3xl font-bold",
                  maxDrawdown < -20 ? "text-red-600" : maxDrawdown < -10 ? "text-orange-500" : "text-yellow-600"
                )}>
                  {maxDrawdown.toFixed(2)}%
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  penurunan terbesar dari puncak ke lembah dalam 30 hari terakhir
                </p>
              </div>
              <div className="ml-auto text-right text-xs text-muted-foreground">
                {maxDrawdown >= -5  && <span className="text-emerald-600 font-medium">Risiko Rendah</span>}
                {maxDrawdown < -5  && maxDrawdown >= -15 && <span className="text-yellow-600 font-medium">Risiko Sedang</span>}
                {maxDrawdown < -15 && maxDrawdown >= -25 && <span className="text-orange-500 font-medium">Risiko Tinggi</span>}
                {maxDrawdown < -25 && <span className="text-red-600 font-medium">Risiko Sangat Tinggi</span>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily bar chart */}
      {daily.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">PnL Harian (30 Hari Terakhir)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dailyChart} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) =>
                    v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}jt`
                    : v <= -1_000_000 ? `${(v / 1_000_000).toFixed(0)}jt`
                    : `${(v / 1000).toFixed(0)}rb`
                  }
                />
                <Tooltip
                  formatter={(value) => [
                    `${Number(value) >= 0 ? "+" : ""}${formatCurrency(Number(value))}`,
                    "PnL",
                  ]}
                  labelStyle={{ fontWeight: 600 }}
                />
                <ReferenceLine y={0} stroke="hsl(var(--border))" />
                <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
                  {dailyChart.map((entry, i) => (
                    <Cell key={i} fill={entry.pnl >= 0 ? "#10b981" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Daily table */}
            <div className="mt-4 rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted border-b text-xs text-muted-foreground">
                    <th className="text-left px-3 py-2 font-medium">Tanggal</th>
                    <th className="text-right px-3 py-2 font-medium hidden sm:table-cell">Nilai Porto</th>
                    <th className="text-right px-3 py-2 font-medium">PnL</th>
                    <th className="text-right px-3 py-2 font-medium">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[...daily].reverse().map((d, i) => {
                    const pnl = Number(d.pnl);
                    const pct = Number(d.pnlPct);
                    const up  = pnl > 0;
                    const cls = pnl === 0 ? "text-muted-foreground" : up ? "text-emerald-600" : "text-red-600";
                    return (
                      <tr key={d.id ?? i} className="hover:bg-muted/40 transition-colors">
                        <td className="px-3 py-2 text-foreground font-medium whitespace-nowrap">
                          {format(new Date(d.date), "dd MMM yyyy", { locale: idLocale })}
                        </td>
                        <td className="px-3 py-2 text-right text-foreground hidden sm:table-cell">
                          {formatCurrency(Number(d.portfolioValue))}
                        </td>
                        <td className={cn("px-3 py-2 text-right font-semibold", cls)}>
                          {pnl >= 0 ? "+" : ""}{formatCurrency(pnl)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <PnlBadge pnl={pnl} pct={pct} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly history */}
      {monthly.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Historis Bulanan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {monthly.length > 1 && (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={monthlyChart} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) =>
                      v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}jt`
                      : v <= -1_000_000 ? `${(v / 1_000_000).toFixed(0)}jt`
                      : `${(v / 1000).toFixed(0)}rb`
                    }
                  />
                  <Tooltip
                    formatter={(value) => [
                      `${Number(value) >= 0 ? "+" : ""}${formatCurrency(Number(value))}`,
                      "PnL",
                    ]}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--border))" />
                  <Bar dataKey="totalPnl" radius={[3, 3, 0, 0]}>
                    {monthlyChart.map((entry, i) => (
                      <Cell key={i} fill={entry.totalPnl >= 0 ? "#10b981" : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Monthly cards */}
            <div className="grid gap-2 sm:grid-cols-3">
              {[...monthly].reverse().map((m) => {
                const pnl = Number(m.totalPnl);
                const pct = Number(m.pnlPct);
                return (
                  <div key={m.id} className="rounded-md border px-4 py-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      {format(new Date(m.month), "MMMM yyyy", { locale: idLocale })}
                    </p>
                    <p className={cn("text-lg font-bold", pnl >= 0 ? "text-emerald-600" : "text-red-600")}>
                      {pnl >= 0 ? "+" : ""}{formatCurrency(pnl)}
                    </p>
                    <PnlBadge pnl={pnl} pct={pct} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
