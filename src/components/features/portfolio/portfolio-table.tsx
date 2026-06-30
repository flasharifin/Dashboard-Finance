"use client";

import { useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber, formatPercent, cn, getUnitLabel } from "@/lib/utils";
import { Pencil, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import type { PortfolioWithCalc } from "@/types";

const EXCHANGE_BADGE: Record<string, string> = {
  IDX: "bg-blue-100 text-blue-700",
  US: "bg-violet-100 text-violet-700",
  CRYPTO: "bg-amber-100 text-amber-700",
};

type SortKey = "stockCode" | "lot" | "avgPrice" | "marketPrice" | "marketValue" | "unrealizedPnl" | "unrealizedPnlPct";
type SortDir = "asc" | "desc";

type Props = {
  portfolios: PortfolioWithCalc[];
  isLoading: boolean;
  onEdit: (p: PortfolioWithCalc) => void;
  onDelete: (id: string) => void;
};

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronUp className="ml-0.5 h-3.5 w-3.5 opacity-20" />;
  return sortDir === "asc"
    ? <ChevronUp className="ml-0.5 h-3.5 w-3.5 text-primary" />
    : <ChevronDown className="ml-0.5 h-3.5 w-3.5 text-primary" />;
}

export function PortfolioTable({ portfolios, isLoading, onEdit, onDelete }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("stockCode");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = [...portfolios].sort((a, b) => {
    const va = a[sortKey] ?? (sortDir === "asc" ? Infinity : -Infinity);
    const vb = b[sortKey] ?? (sortDir === "asc" ? Infinity : -Infinity);
    if (typeof va === "string" && typeof vb === "string") {
      return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    const na = Number(va);
    const nb = Number(vb);
    return sortDir === "asc" ? na - nb : nb - na;
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
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

  const th = (label: string, key: SortKey, align: "left" | "right" = "right") => (
    <TableHead
      className={cn("cursor-pointer select-none hover:text-foreground whitespace-nowrap", align === "right" && "text-right")}
      onClick={() => toggleSort(key)}
    >
      <span className={cn("inline-flex items-center gap-0", align === "right" ? "justify-end w-full" : "")}>
        {align === "right" && <SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />}
        {label}
        {align === "left" && <SortIcon col={key} sortKey={sortKey} sortDir={sortDir} />}
      </span>
    </TableHead>
  );

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table className="min-w-[640px]">
        <TableHeader>
          <TableRow>
            {th("Aset", "stockCode", "left")}
            {th("Qty", "lot")}
            {th("Avg Price", "avgPrice")}
            {th("Last Price", "marketPrice")}
            {th("Nilai Pasar", "marketValue")}
            {th("P&L", "unrealizedPnl")}
            {th("%", "unrealizedPnlPct")}
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((p) => {
            const isProfit = (p.unrealizedPnl ?? 0) >= 0;
            const unitLabel = getUnitLabel(p.exchange);
            const fmtUnits = (n: number) =>
              new Intl.NumberFormat("id-ID", { maximumFractionDigits: 8 }).format(n);
            const qty = p.exchange === "IDX"
              ? `${formatNumber(p.lot, 0)} lot`
              : `${fmtUnits(p.units)} ${unitLabel}`;

            return (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div>
                      <span className="font-semibold">{p.stockCode}</span>
                      {p.sector && <span className="ml-1.5 text-xs text-muted-foreground">{p.sector}</span>}
                      {p.platform && <p className="text-xs text-muted-foreground">{p.platform}</p>}
                    </div>
                    <Badge variant="outline" className={cn("text-xs px-1.5 py-0", EXCHANGE_BADGE[p.exchange])}>
                      {p.exchange}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right text-sm">{qty}</TableCell>
                <TableCell className="text-right">{formatCurrency(p.avgPrice, p.currency)}</TableCell>
                <TableCell className="text-right">
                  {p.marketPrice ? formatCurrency(p.marketPrice, p.currency) : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-right">
                  {p.marketValue ? formatCurrency(p.marketValue, p.currency) : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className={cn("text-right font-medium", isProfit ? "text-emerald-600" : "text-red-600")}>
                  {p.unrealizedPnl !== null ? formatCurrency(p.unrealizedPnl, p.currency) : "—"}
                </TableCell>
                <TableCell className={cn("text-right", isProfit ? "text-emerald-600" : "text-red-600")}>
                  {p.unrealizedPnlPct !== null ? formatPercent(p.unrealizedPnlPct) : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => onDelete(p.id)}>
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
