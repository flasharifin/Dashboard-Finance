"use client";

import { useState } from "react";
import { useDividends, useAddDividend, useDeleteDividend } from "@/hooks/use-dividends";
import { usePortfolio } from "@/hooks/use-portfolio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Banknote } from "lucide-react";
import { formatCurrency, formatPercent, calcDividendYield, calcNetDps, calcReceivedAmount } from "@/lib/utils";
import type { PortfolioWithCalc } from "@/types";

export default function DividendsPage() {
  const { data: dividends = [], isLoading } = useDividends();
  const { data: portfolios = [] } = usePortfolio();
  const addMutation = useAddDividend();
  const deleteMutation = useDeleteDividend();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState("");

  const currentYear = new Date().getFullYear();

  const totalThisYear = dividends
    .filter((d: { paymentDate: string | null }) => d.paymentDate && new Date(d.paymentDate).getFullYear() === currentYear)
    .reduce((s: number, d: { receivedAmount: number | string | null }) => s + Number(d.receivedAmount ?? 0), 0);

  const totalAllTime = dividends.reduce(
    (s: number, d: { receivedAmount: number | string | null }) => s + Number(d.receivedAmount ?? 0),
    0
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const portfolio = portfolios.find((p: PortfolioWithCalc) => p.id === selectedPortfolioId);
    if (!portfolio) return;

    await addMutation.mutateAsync({
      portfolioId: selectedPortfolioId,
      stockCode: portfolio.stockCode,
      dps: Number(form.get("dps")),
      taxPct: Number(form.get("taxPct")),
      cumDate: form.get("cumDate") || null,
      exDate: form.get("exDate") || null,
      paymentDate: form.get("paymentDate") || null,
      note: form.get("note") || undefined,
    });

    setDialogOpen(false);
    setSelectedPortfolioId("");
  }

  async function handleDelete(id: string) {
    if (confirm("Hapus data dividen ini?")) {
      await deleteMutation.mutateAsync(id);
    }
  }

  const selectedPortfolio = portfolios.find((p: PortfolioWithCalc) => p.id === selectedPortfolioId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dividen</h1>
          <p className="text-muted-foreground">Pantau dividen yang diterima</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Catat Dividen
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Dividen {currentYear}
            </CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalThisYear)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Semua Waktu
            </CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalAllTime)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pencatatan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{dividends.length}</p>
            <p className="text-xs text-muted-foreground">entri dividen</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Emiten</TableHead>
              <TableHead className="text-right">DPS (Gross)</TableHead>
              <TableHead className="text-right">Pajak</TableHead>
              <TableHead className="text-right">DPS (Net)</TableHead>
              <TableHead className="text-right">Yield</TableHead>
              <TableHead className="text-right">Diterima</TableHead>
              <TableHead>Payment Date</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : dividends.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                  Belum ada data dividen. Catat dividen pertama Anda.
                </TableCell>
              </TableRow>
            ) : (
              dividends.map((d: {
                id: string;
                stockCode: string;
                dps: number | string;
                taxPct: number | string;
                receivedAmount: number | string | null;
                paymentDate: string | null;
                portfolio?: { avgPrice: number | string };
              }) => {
                const dps = Number(d.dps);
                const taxPct = Number(d.taxPct);
                const netDps = calcNetDps(dps, taxPct);
                const avgPrice = Number(d.portfolio?.avgPrice ?? 0);
                const yld = avgPrice > 0 ? calcDividendYield(dps, avgPrice) : null;

                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.stockCode}</TableCell>
                    <TableCell className="text-right">{formatCurrency(dps)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{taxPct}%</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(netDps)}</TableCell>
                    <TableCell className="text-right text-emerald-600">
                      {yld !== null ? formatPercent(yld) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-emerald-600">
                      {formatCurrency(Number(d.receivedAmount ?? 0))}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {d.paymentDate
                        ? new Date(d.paymentDate).toLocaleDateString("id-ID")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(d.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Catat Dividen</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Emiten</Label>
              <Select value={selectedPortfolioId} onValueChange={(v) => setSelectedPortfolioId(v ?? "")} required>
                <SelectTrigger>
                  <span className={!selectedPortfolioId ? "text-muted-foreground" : undefined}>
                    {selectedPortfolioId
                      ? (() => {
                          const p = portfolios.find((x: PortfolioWithCalc) => x.id === selectedPortfolioId);
                          return p ? `${p.stockCode} — ${p.lot} ${p.exchange === "IDX" ? "lot" : p.exchange === "CRYPTO" ? "unit" : "shares"}` : selectedPortfolioId;
                        })()
                      : "Pilih saham..."}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {portfolios.map((p: PortfolioWithCalc) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.stockCode} — {p.lot} {p.exchange === "IDX" ? "lot" : p.exchange === "CRYPTO" ? "unit" : "shares"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>DPS Gross (Rp/lembar)</Label>
                <Input name="dps" type="number" step="0.0001" min="0.0001" required />
              </div>
              <div className="space-y-2">
                <Label>Pajak (%)</Label>
                <Input name="taxPct" type="number" defaultValue={10} min={0} max={100} required />
              </div>
            </div>

            {selectedPortfolio && (
              <div className="rounded-md bg-muted/40 px-3 py-2 text-sm space-y-1">
                <p>Lot: <b>{selectedPortfolio.lot}</b> · Avg Price: <b>{formatCurrency(selectedPortfolio.avgPrice)}</b></p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Cum Date</Label>
                <Input name="cumDate" type="date" />
              </div>
              <div className="space-y-2">
                <Label>Ex Date</Label>
                <Input name="exDate" type="date" />
              </div>
              <div className="space-y-2">
                <Label>Payment Date</Label>
                <Input name="paymentDate" type="date" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Catatan</Label>
              <Input name="note" placeholder="Opsional" />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={!selectedPortfolioId || addMutation.isPending}>
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
