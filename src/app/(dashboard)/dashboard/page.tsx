"use client";

import { usePortfolio } from "@/hooks/use-portfolio";
import { useDividends } from "@/hooks/use-dividends";
import { useNetWorth } from "@/hooks/use-networth";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";
import { TrendingUp, Banknote, Wallet, TrendingDown, Target } from "lucide-react";
import Link from "next/link";
import type { PortfolioWithCalc } from "@/types";

const EXCHANGE_BADGE: Record<string, string> = {
  IDX: "bg-blue-100 text-blue-700",
  US: "bg-violet-100 text-violet-700",
  CRYPTO: "bg-amber-100 text-amber-700",
};

const TARGET_100M = 100_000_000;

export default function DashboardPage() {
  const { data: portfolios, isLoading: portfolioLoading } = usePortfolio();
  const { data: dividends, isLoading: dividendLoading } = useDividends();
  const { data: networth, isLoading: networthLoading } = useNetWorth();
  const { data: rateData } = useExchangeRate();
  const usdToIdr = rateData?.USDIDR ?? 16000;

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

  // Sama dengan formula di halaman networth: porto + manual - hutang
  const manualAssetsTotal = networth?.totalAssets ?? 0;
  const totalLiabilities = networth?.totalLiabilities ?? 0;
  const totalAssetsAll = portfolioValueIDR + manualAssetsTotal;
  const combinedNetWorth = totalAssetsAll - totalLiabilities;

  const targetProgress = Math.min((combinedNetWorth / TARGET_100M) * 100, 100);
  const targetRemaining = Math.max(TARGET_100M - combinedNetWorth, 0);

  const isLoading = networthLoading || portfolioLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Ringkasan portofolio dan keuangan Anda</p>
      </div>

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

      {/* Target 100 Juta Pertama */}
      <Link href="/networth">
        <Card className="transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-5 w-5 text-primary" />
                Target 100 Juta Pertama
              </CardTitle>
              {isLoading ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                <span className="text-sm font-semibold text-primary">
                  {targetProgress.toFixed(1)}%
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <Skeleton className="h-14 w-full" />
            ) : (
              <>
                {/* Progress bar */}
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
                      Target: {formatCurrency(TARGET_100M)}
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </Link>

      <div className="grid gap-4 lg:grid-cols-2">
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
                        <span
                          className={cn(
                            (p.unrealizedPnlPct ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"
                          )}
                        >
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
