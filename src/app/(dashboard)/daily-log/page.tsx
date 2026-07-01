"use client";

import { usePortfolio } from "@/hooks/use-portfolio";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, cn } from "@/lib/utils";
import { EXCHANGE_BADGE } from "@/lib/constants";
import { TrendingUp, TrendingDown, ArrowUp, ArrowDown, Minus } from "lucide-react";
import type { PortfolioWithCalc } from "@/types";

export default function DailyLogPage() {
  const { data: portfolios, isLoading } = usePortfolio();
  const { data: rateData } = useExchangeRate();
  const usdToIdr = rateData?.USDIDR ?? 16000;

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

  const noData = !isLoading && dailyRows.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Log Harian</h1>
        <p className="text-muted-foreground">Perubahan harga portfolio hari ini vs penutupan kemarin</p>
      </div>

      {/* Summary card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              {totalDailyChangeIDR >= 0 ? (
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
              Total Portfolio
            </CardTitle>
            {!isLoading && dailyRows.length > 0 && (
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
                {totalDailyChangePct >= 0 ? "+" : ""}{totalDailyChangePct.toFixed(2)}%
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-10 w-48" />
          ) : noData ? (
            <p className="text-sm text-muted-foreground">Data harga pasar belum tersedia.</p>
          ) : (
            <p className={cn(
              "text-3xl font-bold",
              totalDailyChangeIDR > 0 ? "text-emerald-600" : totalDailyChangeIDR < 0 ? "text-red-600" : ""
            )}>
              {totalDailyChangeIDR >= 0 ? "+" : ""}
              {formatCurrency(totalDailyChangeIDR)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Per-asset list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rincian Per Aset</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : noData ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Belum ada data harga pasar. Pastikan koneksi internet aktif dan coba refresh.
            </p>
          ) : (
            <div className="divide-y">
              {dailyRows.map((r) => {
                const isUp = r.dailyChangeIDR > 0;
                const isDown = r.dailyChangeIDR < 0;
                const pct = r.dailyChangePercent ?? 0;
                return (
                  <div key={r.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        isUp ? "bg-emerald-50" : isDown ? "bg-red-50" : "bg-muted"
                      )}>
                        {isUp ? (
                          <ArrowUp className="h-4 w-4 text-emerald-600" />
                        ) : isDown ? (
                          <ArrowDown className="h-4 w-4 text-red-500" />
                        ) : (
                          <Minus className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold">{r.stockCode}</span>
                          {r.platform && (
                            <span className="text-xs text-muted-foreground">({r.platform})</span>
                          )}
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] px-1 py-0 leading-4", EXCHANGE_BADGE[r.exchange])}
                          >
                            {r.exchange}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {r.sector ?? "—"}
                          {r.marketPrice != null
                            ? ` · Harga: ${formatCurrency(r.marketPrice, r.currency)}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-4">
                      <p className={cn(
                        "font-semibold",
                        isUp ? "text-emerald-600" : isDown ? "text-red-600" : "text-muted-foreground"
                      )}>
                        {isUp ? "+" : ""}{formatCurrency(r.dailyChangeIDR)}
                      </p>
                      <p className={cn(
                        "text-sm",
                        isUp ? "text-emerald-600" : isDown ? "text-red-600" : "text-muted-foreground"
                      )}>
                        {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
