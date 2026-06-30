"use client";

import { usePortfolio } from "@/hooks/use-portfolio";
import { useDividends } from "@/hooks/use-dividends";
import { useNetWorth } from "@/hooks/use-networth";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";
import { TrendingUp, Banknote, Wallet, TrendingDown } from "lucide-react";
import Link from "next/link";
import type { PortfolioWithCalc } from "@/types";

const EXCHANGE_BADGE: Record<string, string> = {
  IDX: "bg-blue-100 text-blue-700",
  US: "bg-violet-100 text-violet-700",
  CRYPTO: "bg-amber-100 text-amber-700",
};

export default function DashboardPage() {
  const { data: portfolios, isLoading: portfolioLoading } = usePortfolio();
  const { data: dividends, isLoading: dividendLoading } = useDividends();
  const { data: networth, isLoading: networthLoading } = useNetWorth();
  const { data: rateData } = useExchangeRate();
  const usdToIdr = rateData?.USDIDR ?? 16000;

  const portfolioSummary = portfolios
    ? {
        totalCostIDR:
          portfolios.reduce(
            (s, p) => s + (p.currency === "IDR" ? p.totalCost : p.totalCost * usdToIdr),
            0
          ),
        unrealizedPnl:
          portfolios.reduce(
            (s, p) =>
              s +
              ((p.unrealizedPnl ?? 0) * (p.currency === "IDR" ? 1 : usdToIdr)),
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
            d.paymentDate &&
            new Date(d.paymentDate).getFullYear() === currentYear
        )
        .reduce(
          (s: number, d: { receivedAmount: string | number | null }) =>
            s + Number(d.receivedAmount ?? 0),
          0
        )
    : 0;

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
          value={networth ? formatCurrency(networth.netValue, "IDR") : null}
          sub={
            networth
              ? `Aset: ${formatCurrency(networth.totalAssets, "IDR")} · Hutang: ${formatCurrency(networth.totalLiabilities, "IDR")}`
              : null
          }
          icon={<Wallet className="h-4 w-4" />}
          valueClass={(networth?.netValue ?? 0) >= 0 ? "" : "text-red-600"}
          loading={networthLoading}
          href="/networth"
        />
      </div>

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
                  ?.sort(
                    (a, b) => (b.unrealizedPnlPct ?? 0) - (a.unrealizedPnlPct ?? 0)
                  )
                  .slice(0, 5)
                  .map((p: PortfolioWithCalc) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn("text-xs px-1.5 py-0", EXCHANGE_BADGE[p.exchange])}
                        >
                          {p.exchange}
                        </Badge>
                        <span className="font-medium">{p.stockCode}</span>
                      </div>
                      <div className="text-right">
                        <span
                          className={cn(
                            (p.unrealizedPnlPct ?? 0) >= 0
                              ? "text-emerald-600"
                              : "text-red-600"
                          )}
                        >
                          {p.unrealizedPnlPct !== null
                            ? formatPercent(p.unrealizedPnlPct)
                            : "—"}
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
                      <div
                        key={d.id}
                        className="flex items-center justify-between text-sm"
                      >
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
