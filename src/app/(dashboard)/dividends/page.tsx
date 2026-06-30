"use client";

import { useState } from "react";
import { useDividends, useAddDividend, useUpdateDividend, useDeleteDividend } from "@/hooks/use-dividends";
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
import { Plus, Trash2, Banknote, Download, Pencil } from "lucide-react";
import { formatCurrency, formatPercent, calcDividendYield, calcNetDps, calcReceivedAmount, exportToCSV, cn } from "@/lib/utils";
import type { PortfolioWithCalc } from "@/types";

export default function DividendsPage() {
  const { data: dividends = [], isLoading } = useDividends();
  const { data: portfolios = [] } = usePortfolio();
  const addMutation = useAddDividend();
  const updateMutation = useUpdateDividend();
  const deleteMutation = useDeleteDividend();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState("");

  // Edit state
  type DividendRow = {
    id: string; stockCode: string; dps: number | string; taxPct: number | string;
    receivedAmount: number | string | null; paymentDate: string | null;
    cumDate: string | null; exDate: string | null; note: string | null;
    portfolio?: { avgPrice: number | string };
  };
  const [editDividend, setEditDividend] = useState<DividendRow | null>(null);

  const currentYear = new Date().getFullYear();

  const totalThisYear = dividends
    .filter((d: { paymentDate: string | null }) => d.paymentDate && new Date(d.paymentDate).getFullYear() === currentYear)
    .reduce((s: number, d: { receivedAmount: number | string | null }) => s + Number(d.receivedAmount ?? 0), 0);

  const totalAllTime = dividends.reduce(
    (s: number, d: { receivedAmount: number | string | null }) => s + Number(d.receivedAmount ?? 0),
    0
  );

  // ── Quarterly breakdown tahun ini ─────────────────────────────
  const quarterlyThisYear = [1, 2, 3, 4].map((q) => {
    const months = [(q - 1) * 3 + 1, (q - 1) * 3 + 2, q * 3];
    const total = dividends
      .filter((d: { paymentDate: string | null }) => {
        if (!d.paymentDate) return false;
        const dt = new Date(d.paymentDate);
        return dt.getFullYear() === currentYear && months.includes(dt.getMonth() + 1);
      })
      .reduce((s: number, d: { receivedAmount: number | string | null }) => s + Number(d.receivedAmount ?? 0), 0);
    return { quarter: `Q${q}`, total };
  });

  // ── Proyeksi tahunan ─────────────────────────────────────────
  const currentMonth = new Date().getMonth() + 1;
  const projectedAnnual = currentMonth > 0 && totalThisYear > 0
    ? (totalThisYear / currentMonth) * 12
    : 0;

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

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editDividend) return;
    const form = new FormData(e.currentTarget);
    await updateMutation.mutateAsync({
      id: editDividend.id,
      dps: Number(form.get("dps")),
      taxPct: Number(form.get("taxPct")),
      cumDate: form.get("cumDate") || null,
      exDate: form.get("exDate") || null,
      paymentDate: form.get("paymentDate") || null,
      note: form.get("note") || undefined,
    });
    setEditDividend(null);
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => exportToCSV(`dividen-${new Date().toISOString().slice(0,10)}.csv`,
              dividends.map((d: {
                stockCode: string; dps: number | string; taxPct: number | string;
                receivedAmount: number | string | null; paymentDate: string | null;
                cumDate: string | null; exDate: string | null; note: string | null;
              }) => ({
                Emiten: d.stockCode,
                "DPS Gross": Number(d.dps),
                "Pajak %": Number(d.taxPct),
                "DPS Net": calcNetDps(Number(d.dps), Number(d.taxPct)),
                "Total Diterima": Number(d.receivedAmount ?? 0),
                "Cum Date": d.cumDate ? new Date(d.cumDate).toLocaleDateString("id-ID") : "",
                "Ex Date": d.exDate ? new Date(d.exDate).toLocaleDateString("id-ID") : "",
                "Payment Date": d.paymentDate ? new Date(d.paymentDate).toLocaleDateString("id-ID") : "",
                Catatan: d.note ?? "",
              }))
            )}
            disabled={dividends.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Catat Dividen
          </Button>
        </div>
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

      {/* Quarterly + Proyeksi */}
      {dividends.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Breakdown per Kuartal {currentYear}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quarterlyThisYear.map(({ quarter, total }) => (
                <div key={quarter} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{quarter}</span>
                  <div className="flex items-center gap-3">
                    <div className="h-2 rounded-full bg-muted overflow-hidden w-24">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: totalThisYear > 0 ? `${(total / totalThisYear) * 100}%` : "0%" }}
                      />
                    </div>
                    <span className={cn("font-medium w-28 text-right", total > 0 ? "text-emerald-600" : "text-muted-foreground")}>
                      {total > 0 ? formatCurrency(total) : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Proyeksi Dividen Tahunan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(projectedAnnual)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Estimasi berdasarkan rata-rata bulan Jan–{new Date().toLocaleString("id-ID", { month: "short" })} {currentYear}
                </p>
              </div>
              <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground space-y-0.5">
                <p>Diterima tahun ini: <b className="text-foreground">{formatCurrency(totalThisYear)}</b></p>
                <p>Bulan berjalan: <b className="text-foreground">{currentMonth}</b> dari 12 bulan</p>
                <p>Rata-rata per bulan: <b className="text-foreground">{formatCurrency(totalThisYear / currentMonth)}</b></p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="rounded-md border overflow-x-auto">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead>Emiten</TableHead>
              <TableHead className="text-right">DPS (Gross)</TableHead>
              <TableHead className="text-right">Pajak</TableHead>
              <TableHead className="text-right">DPS (Net)</TableHead>
              <TableHead className="text-right">Yield</TableHead>
              <TableHead className="text-right">Diterima</TableHead>
              <TableHead>Payment Date</TableHead>
              <TableHead className="w-[80px]" />
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
              dividends.map((d: DividendRow) => {
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
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7"
                          onClick={() => setEditDividend(d)}>
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button size="icon" variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(d.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Dialog Edit Dividen ─────────────────────────────────── */}
      <Dialog open={!!editDividend} onOpenChange={(o) => !o && setEditDividend(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Dividen — {editDividend?.stockCode}</DialogTitle></DialogHeader>
          {editDividend && (
            <form key={editDividend.id} onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>DPS Gross (Rp/lembar)</Label>
                  <Input name="dps" type="number" step="0.0001" min="0.0001" required defaultValue={Number(editDividend.dps)} />
                </div>
                <div className="space-y-2">
                  <Label>Pajak (%)</Label>
                  <Input name="taxPct" type="number" min={0} max={100} required defaultValue={Number(editDividend.taxPct)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Cum Date</Label>
                  <Input name="cumDate" type="date" defaultValue={editDividend.cumDate ? new Date(editDividend.cumDate).toISOString().split("T")[0] : ""} />
                </div>
                <div className="space-y-2">
                  <Label>Ex Date</Label>
                  <Input name="exDate" type="date" defaultValue={editDividend.exDate ? new Date(editDividend.exDate).toISOString().split("T")[0] : ""} />
                </div>
                <div className="space-y-2">
                  <Label>Payment Date</Label>
                  <Input name="paymentDate" type="date" defaultValue={editDividend.paymentDate ? new Date(editDividend.paymentDate).toISOString().split("T")[0] : ""} />
                </div>
              </div>
              <div className="space-y-2"><Label>Catatan</Label><Input name="note" defaultValue={editDividend.note ?? ""} placeholder="Opsional" /></div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDividend(null)}>Batal</Button>
                <Button type="submit" disabled={updateMutation.isPending}>Simpan</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

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
                          if (!p) return selectedPortfolioId;
                          const qty = `${p.lot} ${p.exchange === "IDX" ? "lot" : p.exchange === "CRYPTO" ? "unit" : "shares"}`;
                          return p.platform ? `${p.stockCode} (${p.platform}) — ${qty}` : `${p.stockCode} — ${qty}`;
                        })()
                      : "Pilih saham..."}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {portfolios.map((p: PortfolioWithCalc) => {
                    const qty = `${p.lot} ${p.exchange === "IDX" ? "lot" : p.exchange === "CRYPTO" ? "unit" : "shares"}`;
                    return (
                      <SelectItem key={p.id} value={p.id}>
                        {p.platform ? `${p.stockCode} (${p.platform}) — ${qty}` : `${p.stockCode} — ${qty}`}
                      </SelectItem>
                    );
                  })}
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
