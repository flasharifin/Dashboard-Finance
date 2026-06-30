"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber, formatPercent, cn, getUnitLabel } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";
import type { PortfolioWithCalc } from "@/types";

const EXCHANGE_BADGE: Record<string, string> = {
  IDX: "bg-blue-100 text-blue-700",
  US: "bg-violet-100 text-violet-700",
  CRYPTO: "bg-amber-100 text-amber-700",
};

type Props = {
  portfolios: PortfolioWithCalc[];
  isLoading: boolean;
  onEdit: (p: PortfolioWithCalc) => void;
  onDelete: (id: string) => void;
};

export function PortfolioTable({ portfolios, isLoading, onEdit, onDelete }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (portfolios.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Belum ada posisi. Tambah saham, US stocks, atau crypto pertama Anda.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Aset</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Avg Price</TableHead>
            <TableHead className="text-right">Last Price</TableHead>
            <TableHead className="text-right">Nilai Pasar</TableHead>
            <TableHead className="text-right">P&L</TableHead>
            <TableHead className="text-right">%</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {portfolios.map((p) => {
            const isProfit = (p.unrealizedPnl ?? 0) >= 0;
            const unitLabel = getUnitLabel(p.exchange);
            const qty = p.exchange === "IDX"
              ? `${formatNumber(p.lot, 0)} lot`
              : `${formatNumber(p.units, p.exchange === "CRYPTO" ? 4 : 0)} ${unitLabel}`;

            return (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div>
                      <span className="font-semibold">{p.stockCode}</span>
                      {p.sector && (
                        <span className="ml-1.5 text-xs text-muted-foreground">{p.sector}</span>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("text-xs px-1.5 py-0", EXCHANGE_BADGE[p.exchange])}
                    >
                      {p.exchange}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right text-sm">{qty}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(p.avgPrice, p.currency)}
                </TableCell>
                <TableCell className="text-right">
                  {p.marketPrice
                    ? formatCurrency(p.marketPrice, p.currency)
                    : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-right">
                  {p.marketValue
                    ? formatCurrency(p.marketValue, p.currency)
                    : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-medium",
                    isProfit ? "text-emerald-600" : "text-red-600"
                  )}
                >
                  {p.unrealizedPnl !== null
                    ? formatCurrency(p.unrealizedPnl, p.currency)
                    : "—"}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right",
                    isProfit ? "text-emerald-600" : "text-red-600"
                  )}
                >
                  {p.unrealizedPnlPct !== null ? formatPercent(p.unrealizedPnlPct) : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => onEdit(p)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => onDelete(p.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
