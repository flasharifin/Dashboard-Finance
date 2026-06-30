"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { TrendingUp, TrendingDown, Wallet, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  totalCost: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  totalPositions: number;
};

export function PortfolioSummaryCards({
  totalCost,
  marketValue,
  unrealizedPnl,
  unrealizedPnlPct,
  totalPositions,
}: Props) {
  const isProfit = unrealizedPnl >= 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Modal</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatCurrency(totalCost)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Nilai Pasar</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatCurrency(marketValue)}</p>
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
          <p className={cn("text-2xl font-bold", isProfit ? "text-emerald-600" : "text-red-600")}>
            {formatCurrency(unrealizedPnl)}
          </p>
          <p className={cn("text-xs", isProfit ? "text-emerald-600" : "text-red-600")}>
            {formatPercent(unrealizedPnlPct)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Emiten
          </CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{totalPositions}</p>
          <p className="text-xs text-muted-foreground">posisi aktif</p>
        </CardContent>
      </Card>
    </div>
  );
}
