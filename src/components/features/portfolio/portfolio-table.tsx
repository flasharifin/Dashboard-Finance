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
import { formatCurrency, formatNumber, formatPercent, cn } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";
import type { PortfolioWithCalc } from "@/types";

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
        Belum ada posisi. Tambah saham pertama Anda.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kode</TableHead>
            <TableHead className="text-right">Lot</TableHead>
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
            return (
              <TableRow key={p.id}>
                <TableCell>
                  <div>
                    <span className="font-semibold">{p.stockCode}</span>
                    {p.sector && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {p.sector}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">{formatNumber(p.lot, 0)}</TableCell>
                <TableCell className="text-right">{formatCurrency(p.avgPrice)}</TableCell>
                <TableCell className="text-right">
                  {p.marketPrice ? formatCurrency(p.marketPrice) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {p.marketValue ? formatCurrency(p.marketValue) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className={cn("text-right font-medium", isProfit ? "text-emerald-600" : "text-red-600")}>
                  {p.unrealizedPnl !== null ? formatCurrency(p.unrealizedPnl) : "—"}
                </TableCell>
                <TableCell className={cn("text-right", isProfit ? "text-emerald-600" : "text-red-600")}>
                  {p.unrealizedPnlPct !== null ? formatPercent(p.unrealizedPnlPct) : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(p)}>
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
