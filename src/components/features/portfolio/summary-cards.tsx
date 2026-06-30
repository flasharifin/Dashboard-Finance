"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Wallet, BarChart3, DollarSign } from "lucide-react";
import type { PortfolioWithCalc } from "@/types";

type Props = {
  portfolios: PortfolioWithCalc[];
  usdToIdr: number;
};

export function PortfolioSummaryCards({ portfolios, usdToIdr }: Props) {
  const idrPortfolios = portfolios.filter((p) => p.currency === "IDR");
  const usdPortfolios = portfolios.filter((p) => p.currency === "USD");

  const totalCostIDR = idrPortfolios.reduce((s, p) => s + p.totalCost, 0);
  const totalCostUSD = usdPortfolios.reduce((s, p) => s + p.totalCost, 0);

  const marketValueIDR = idrPortfolios.reduce(
    (s, p) => s + (p.marketValue ?? p.totalCost),
    0
  );
  const marketValueUSD = usdPortfolios.reduce(
    (s, p) => s + (p.marketValue ?? p.totalCost),
    0
  );

  const pnlIDR = idrPortfolios.reduce((s, p) => s + (p.unrealizedPnl ?? 0), 0);
  const pnlUSD = usdPortfolios.reduce((s, p) => s + (p.unrealizedPnl ?? 0), 0);

  // Total dalam IDR (konversi USD → IDR)
  const totalCostAll = totalCostIDR + totalCostUSD * usdToIdr;
  const unrealizedPnlAll = pnlIDR + pnlUSD * usdToIdr;
  const unrealizedPnlPct =
    totalCostAll > 0 ? (unrealizedPnlAll / totalCostAll) * 100 : 0;
  const isProfit = unrealizedPnlAll >= 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Modal (IDR)
          </CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatCurrency(totalCostIDR, "IDR")}</p>
          {totalCostUSD > 0 && (
            <p className="text-xs text-muted-foreground">
              + {formatCurrency(totalCostUSD, "USD")} USD
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Nilai Pasar (IDR)
          </CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatCurrency(marketValueIDR, "IDR")}</p>
          {marketValueUSD > 0 && (
            <p className="text-xs text-muted-foreground">
              + {formatCurrency(marketValueUSD, "USD")} USD
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Unrealized P&L
          </CardTitle>
          {isProfit ? (
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-500" />
          )}
        </CardHeader>
        <CardContent>
          <p className={cn("text-xl font-bold", isProfit ? "text-emerald-600" : "text-red-600")}>
            {formatCurrency(unrealizedPnlAll, "IDR")}
          </p>
          <p className={cn("text-xs", isProfit ? "text-emerald-600" : "text-red-600")}>
            {formatPercent(unrealizedPnlPct)}
            {pnlUSD !== 0 && ` · ${formatCurrency(pnlUSD, "USD")}`}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Kurs USD/IDR
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatCurrency(usdToIdr, "IDR")}</p>
          <p className="text-xs text-muted-foreground">
            {portfolios.length} posisi aktif
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
