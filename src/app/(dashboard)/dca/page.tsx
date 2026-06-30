"use client";

import { useState } from "react";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import {
  useDcaPlans, useAddDcaPlan, useUpdateDcaPlan, useDeleteDcaPlan,
  useDcaTransactions, useAddDcaTransaction, useDeleteDcaTransaction,
} from "@/hooks/use-dca";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatCurrency, calcAvgPrice, getUnitLabel, calcUnits, cn } from "@/lib/utils";
import { Calculator, Plus, Trash2, ToggleLeft, ToggleRight, Pencil } from "lucide-react";
import type { PortfolioWithCalc } from "@/types";

const EXCHANGE_BADGE: Record<string, string> = {
  IDX: "bg-blue-100 text-blue-700",
  US: "bg-violet-100 text-violet-700",
  CRYPTO: "bg-amber-100 text-amber-700",
};

const FREQ_LABEL: Record<string, string> = {
  weekly: "Mingguan",
  monthly: "Bulanan",
  custom: "Custom",
};

type DcaPlan = {
  id: string; portfolioId: string; stockCode: string;
  targetPrice: number | string; budget: number | string;
  frequency: string; nextDate: string | null;
  isActive: boolean; note: string | null;
};

type DcaTx = {
  id: string; stockCode: string; lot: number | string;
  price: number | string; totalCost: number | string;
  buyDate: string; note: string | null;
};

export default function DcaPage() {
  const { data: portfolios = [] } = usePortfolio();
  const { data: rateData } = useExchangeRate();
  const { data: plans = [], isLoading: plansLoading } = useDcaPlans();
  const { data: transactions = [], isLoading: txLoading } = useDcaTransactions();
  const usdToIdr = rateData?.USDIDR ?? 16000;

  const addPlanMutation = useAddDcaPlan();
  const updatePlanMutation = useUpdateDcaPlan();
  const deletePlanMutation = useDeleteDcaPlan();
  const addTxMutation = useAddDcaTransaction();
  const deleteTxMutation = useDeleteDcaTransaction();

  // ── Kalkulator ───────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState("");
  const [newLot, setNewLot] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [budget, setBudget] = useState("");

  // ── Plan dialog (add) ────────────────────────────────────────────
  const [planDialog, setPlanDialog] = useState(false);
  const [planPortfolioId, setPlanPortfolioId] = useState("");
  const [planFreq, setPlanFreq] = useState("monthly");

  // ── Plan dialog (edit) ───────────────────────────────────────────
  const [editPlanDialog, setEditPlanDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<DcaPlan | null>(null);
  const [editPlanFreq, setEditPlanFreq] = useState("monthly");

  // ── Tx dialog ────────────────────────────────────────────────────
  const [txDialog, setTxDialog] = useState(false);
  const [txPortfolioId, setTxPortfolioId] = useState("");
  const [txPlanId, setTxPlanId] = useState("");

  const selected = portfolios.find((p: PortfolioWithCalc) => p.id === selectedId);
  const unitLabel = selected ? getUnitLabel(selected.exchange) : "lot";

  const simResult =
    selected && newLot && newPrice
      ? {
          newAvgPrice: calcAvgPrice(selected.lot, selected.avgPrice, Number(newLot), Number(newPrice)),
          totalQty: selected.lot + Number(newLot),
          additionalCost: Number(newLot) * Number(newPrice),
          totalCost: selected.totalCost + Number(newLot) * Number(newPrice),
        }
      : null;

  // Rekomendasi lot berdasarkan budget
  const budgetRec = (() => {
    if (!budget || !selected) return null;
    const budgetNum = Number(budget);
    const pricePerUnit = selected.marketPrice ?? (Number(newPrice) || selected.avgPrice);
    if (!pricePerUnit) return null;
    const priceIDR = selected.currency === "USD" ? pricePerUnit * usdToIdr : pricePerUnit;
    const budgetIDR = budgetNum;
    if (selected.exchange === "IDX") {
      const lotCost = priceIDR * 100;
      const lots = Math.floor(budgetIDR / lotCost);
      return { qty: lots, unit: "lot", cost: lots * lotCost, priceRef: priceIDR };
    } else {
      const units = budgetIDR / priceIDR;
      return { qty: units, unit: unitLabel, cost: budgetIDR, priceRef: priceIDR };
    }
  })();

  const candidates = portfolios
    .filter((p: PortfolioWithCalc) => p.unrealizedPnlPct !== null && p.unrealizedPnlPct < 0)
    .sort((a: PortfolioWithCalc, b: PortfolioWithCalc) => (a.unrealizedPnlPct ?? 0) - (b.unrealizedPnlPct ?? 0))
    .slice(0, 5);

  // ── Handlers ──────────────────────────────────────────────────────
  async function handleAddPlan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const portfolio = portfolios.find((p: PortfolioWithCalc) => p.id === planPortfolioId);
    if (!portfolio) return;
    await addPlanMutation.mutateAsync({
      portfolioId: planPortfolioId,
      stockCode: portfolio.stockCode,
      targetPrice: Number(form.get("targetPrice")),
      budget: Number(form.get("budget")),
      frequency: planFreq,
      nextDate: (form.get("nextDate") as string) || null,
      note: (form.get("note") as string) || undefined,
    });
    setPlanDialog(false);
    setPlanPortfolioId("");
    setPlanFreq("monthly");
  }

  function openEditPlan(plan: DcaPlan) {
    setEditingPlan(plan);
    setEditPlanFreq(plan.frequency);
    setEditPlanDialog(true);
  }

  async function handleEditPlan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingPlan) return;
    const form = new FormData(e.currentTarget);
    await updatePlanMutation.mutateAsync({
      id: editingPlan.id,
      targetPrice: Number(form.get("targetPrice")),
      budget: Number(form.get("budget")),
      frequency: editPlanFreq,
      nextDate: (form.get("nextDate") as string) || null,
      note: (form.get("note") as string) || undefined,
    });
    setEditPlanDialog(false);
    setEditingPlan(null);
  }

  async function handleAddTx(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const portfolio = portfolios.find((p: PortfolioWithCalc) => p.id === txPortfolioId);
    if (!portfolio) return;
    await addTxMutation.mutateAsync({
      portfolioId: txPortfolioId,
      stockCode: portfolio.stockCode,
      dcaPlanId: txPlanId || null,
      lot: Number(form.get("lot")),
      price: Number(form.get("price")),
      buyDate: (form.get("buyDate") as string) || undefined,
      note: (form.get("note") as string) || undefined,
    });
    setTxDialog(false);
    setTxPortfolioId("");
    setTxPlanId("");
  }

  const planPortfolio = portfolios.find((p: PortfolioWithCalc) => p.id === planPortfolioId);
  const txPortfolio = portfolios.find((p: PortfolioWithCalc) => p.id === txPortfolioId);
  const plansForTxPortfolio = plans.filter((pl: DcaPlan) => pl.portfolioId === txPortfolioId);
  const totalTxCost = transactions.reduce((s: number, t: DcaTx) => s + Number(t.totalCost), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">DCA Planner</h1>
        <p className="text-muted-foreground">Simulasi, rencana, dan histori Dollar Cost Averaging</p>
      </div>

      <Tabs defaultValue="calculator">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="calculator" className="flex-1 sm:flex-none">Kalkulator</TabsTrigger>
          <TabsTrigger value="plans" className="flex-1 sm:flex-none">
            Rencana
            {plans.length > 0 && <Badge className="ml-1.5 h-4 px-1 text-[10px]">{plans.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1 sm:flex-none">
            Histori
            {transactions.length > 0 && <Badge className="ml-1.5 h-4 px-1 text-[10px]">{transactions.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* ── TAB: Kalkulator ─────────────────────────────────────── */}
        <TabsContent value="calculator" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calculator className="h-5 w-5" />
                  Kalkulator DCA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Pilih Aset</Label>
                  <Select value={selectedId} onValueChange={(v) => { setSelectedId(v ?? ""); setNewLot(""); setNewPrice(""); setBudget(""); }}>
                    <SelectTrigger>
                      <span className={!selectedId ? "text-muted-foreground" : undefined}>
                        {selectedId
                          ? (() => {
                              const p = portfolios.find((x: PortfolioWithCalc) => x.id === selectedId);
                              if (!p) return selectedId;
                              return `[${p.exchange}] ${p.platform ? `${p.stockCode} (${p.platform})` : p.stockCode} — ${formatCurrency(p.avgPrice, p.currency)}`;
                            })()
                          : "Pilih aset dari portfolio..."}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {portfolios.map((p: PortfolioWithCalc) => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className={cn("mr-1.5 rounded px-1 text-xs font-medium", EXCHANGE_BADGE[p.exchange])}>{p.exchange}</span>
                          {p.platform ? `${p.stockCode} (${p.platform})` : p.stockCode} — {formatCurrency(p.avgPrice, p.currency)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selected && (
                  <div className="rounded-md bg-muted/40 p-3 text-sm space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Posisi saat ini</span>
                      <span className="font-medium">
                        {selected.lot} {unitLabel}
                        {selected.exchange === "IDX" && <span className="text-muted-foreground ml-1">({selected.units} lembar)</span>}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg price</span>
                      <span className="font-medium">{formatCurrency(selected.avgPrice, selected.currency)}</span>
                    </div>
                    {selected.marketPrice && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Harga pasar</span>
                        <span className="font-medium">{formatCurrency(selected.marketPrice, selected.currency)}</span>
                      </div>
                    )}
                  </div>
                )}

                <Separator />

                {/* Simulasi DCA */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{selected?.exchange === "IDX" ? "Lot baru" : selected?.exchange === "US" ? "Shares baru" : "Unit baru"}</Label>
                    <Input type="number" step="any" min="0" value={newLot} onChange={(e) => setNewLot(e.target.value)} placeholder="10" />
                  </div>
                  <div className="space-y-2">
                    <Label>Harga beli ({selected?.currency ?? "IDR"})</Label>
                    <Input type="number" step="any" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder={selected?.currency === "USD" ? "150.00" : "8000"} />
                  </div>
                </div>

                {simResult && selected && (
                  <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
                    <p className="font-semibold text-sm">Hasil Simulasi</p>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg price baru</span>
                        <span className="font-bold text-primary">{formatCurrency(simResult.newAvgPrice, selected.currency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total qty</span>
                        <span className="font-semibold">{simResult.totalQty} {unitLabel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Biaya tambahan</span>
                        <span className="font-semibold">
                          {formatCurrency(simResult.additionalCost, selected.currency)}
                          {selected.currency === "USD" && <span className="text-muted-foreground ml-1 text-xs">≈ {formatCurrency(simResult.additionalCost * usdToIdr)}</span>}
                        </span>
                      </div>
                      {selected.marketPrice && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Gap ke pasar</span>
                          <span className={simResult.newAvgPrice > selected.marketPrice ? "font-semibold text-red-600" : "font-semibold text-emerald-600"}>
                            {formatCurrency(Math.abs(simResult.newAvgPrice - selected.marketPrice), selected.currency)}{" "}
                            ({simResult.newAvgPrice > selected.marketPrice ? "masih rugi" : "sudah profit"})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Rekomendasi lot dari budget */}
                <div className="space-y-2">
                  <Label>Rekomendasi dari Budget (IDR)</Label>
                  <Input
                    type="number" step="any" min="0"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="1000000"
                    disabled={!selected}
                  />
                  {!selected && <p className="text-xs text-muted-foreground">Pilih aset terlebih dahulu</p>}
                </div>

                {budgetRec && selected && (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 space-y-1.5 text-sm">
                    <p className="font-semibold text-emerald-700">Dengan budget {formatCurrency(Number(budget))}</p>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bisa beli</span>
                      <span className="font-bold text-emerald-700">
                        {selected.exchange === "IDX"
                          ? `${budgetRec.qty} lot (${budgetRec.qty * 100} lembar)`
                          : `${budgetRec.qty.toFixed(selected.exchange === "CRYPTO" ? 6 : 4)} ${budgetRec.unit}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total biaya</span>
                      <span className="font-semibold">{formatCurrency(budgetRec.cost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Referensi harga</span>
                      <span className="text-xs text-muted-foreground">
                        {selected.marketPrice ? "Harga pasar" : "Avg price"} — {formatCurrency(budgetRec.priceRef)}
                      </span>
                    </div>
                    {selected.exchange === "IDX" && budgetRec.qty === 0 && (
                      <p className="text-xs text-amber-600">Budget kurang untuk 1 lot. Butuh minimal {formatCurrency(budgetRec.priceRef * 100)}</p>
                    )}
                  </div>
                )}

                {!selected && !simResult && !budgetRec && (
                  <p className="text-sm text-muted-foreground text-center py-2">Pilih aset untuk memulai simulasi.</p>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Kandidat DCA (Posisi Merah)</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {candidates.map((p: PortfolioWithCalc) => (
                      <div key={p.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn("text-xs px-1.5", EXCHANGE_BADGE[p.exchange])}>{p.exchange}</Badge>
                          <span className="font-medium">{p.stockCode}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-red-600">{p.unrealizedPnlPct?.toFixed(2)}%</span>
                          <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={() => setSelectedId(p.id)}>Simulasi</Button>
                        </div>
                      </div>
                    ))}
                    {candidates.length === 0 && <p className="text-muted-foreground text-sm py-2">Semua posisi sedang profit.</p>}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Info Exchange</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">IDX</span>
                      <span>Bursa Efek Indonesia — lot × 100 lembar, harga dalam IDR</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-violet-100 px-1.5 py-0.5 text-xs font-medium text-violet-700">US</span>
                      <span>NYSE / NASDAQ — per share, harga dalam USD</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">Crypto</span>
                      <span>BTC, ETH, SOL, dll — per coin, harga dalam USD</span>
                    </div>
                  </div>
                  <Separator />
                  <p><b className="text-foreground">Kurs saat ini:</b> 1 USD = {formatCurrency(usdToIdr)}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── TAB: Rencana DCA ─────────────────────────────────────── */}
        <TabsContent value="plans" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setPlanDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />Buat Rencana
            </Button>
          </div>

          {plansLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : plans.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Belum ada rencana DCA. Buat rencana untuk melacak jadwal dan target beli.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {plans.map((plan: DcaPlan) => (
                <Card key={plan.id} className={cn(!plan.isActive && "opacity-60")}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{plan.stockCode}</span>
                          <Badge variant="outline" className="text-xs">{FREQ_LABEL[plan.frequency] ?? plan.frequency}</Badge>
                          {!plan.isActive && <Badge variant="secondary" className="text-xs">Non-aktif</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span>Target: <b className="text-foreground">{formatCurrency(Number(plan.targetPrice))}</b></span>
                          <span>Budget: <b className="text-foreground">{formatCurrency(Number(plan.budget))}</b></span>
                          {plan.nextDate && <span>Jadwal: <b className="text-foreground">{new Date(plan.nextDate).toLocaleDateString("id-ID")}</b></span>}
                        </div>
                        {plan.note && <p className="text-xs text-muted-foreground">{plan.note}</p>}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditPlan(plan)}>
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" title={plan.isActive ? "Non-aktifkan" : "Aktifkan"}
                          onClick={() => updatePlanMutation.mutate({ id: plan.id, isActive: !plan.isActive })}>
                          {plan.isActive ? <ToggleRight className="h-4 w-4 text-emerald-600" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => { if (confirm(`Hapus rencana DCA ${plan.stockCode}?`)) deletePlanMutation.mutate(plan.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── TAB: Histori ─────────────────────────────────────────── */}
        <TabsContent value="history" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            {transactions.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Total investasi DCA: <b className="text-foreground">{formatCurrency(totalTxCost)}</b>
              </p>
            )}
            <Button className="ml-auto" onClick={() => setTxDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />Catat Pembelian
            </Button>
          </div>

          {txLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : transactions.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Belum ada histori pembelian DCA. Catat setiap transaksi DCA Anda.</CardContent></Card>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table className="min-w-[500px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Aset</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Harga</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx: DcaTx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">{tx.stockCode}</TableCell>
                      <TableCell className="text-right">{Number(tx.lot)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(tx.price))}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(Number(tx.totalCost))}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{new Date(tx.buyDate).toLocaleDateString("id-ID")}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => { if (confirm("Hapus catatan ini?")) deleteTxMutation.mutate(tx.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Tambah Rencana ────────────────────────────────── */}
      <Dialog open={planDialog} onOpenChange={setPlanDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Buat Rencana DCA</DialogTitle></DialogHeader>
          <form key={planDialog ? "open" : "closed"} onSubmit={handleAddPlan} className="space-y-4">
            <div className="space-y-2">
              <Label>Aset</Label>
              <Select value={planPortfolioId} onValueChange={(v) => setPlanPortfolioId(v ?? "")} required>
                <SelectTrigger>
                  <span className={!planPortfolioId ? "text-muted-foreground" : undefined}>
                    {planPortfolio ? `${planPortfolio.stockCode}${planPortfolio.platform ? ` (${planPortfolio.platform})` : ""}` : "Pilih aset..."}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {portfolios.map((p: PortfolioWithCalc) => (
                    <SelectItem key={p.id} value={p.id}>{p.stockCode}{p.platform ? ` (${p.platform})` : ""} — {p.exchange}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Harga ({planPortfolio?.currency ?? "IDR"})</Label>
                <Input name="targetPrice" type="number" step="any" min="0" required placeholder={planPortfolio?.currency === "USD" ? "150" : "8000"} />
              </div>
              <div className="space-y-2">
                <Label>Budget (IDR)</Label>
                <Input name="budget" type="number" step="any" min="0" required placeholder="1000000" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frekuensi</Label>
                <Select value={planFreq} onValueChange={(v) => setPlanFreq(v ?? "monthly")}>
                  <SelectTrigger><span>{FREQ_LABEL[planFreq]}</span></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Mingguan</SelectItem>
                    <SelectItem value="monthly">Bulanan</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Jadwal Berikutnya</Label>
                <Input name="nextDate" type="date" />
              </div>
            </div>
            <div className="space-y-2"><Label>Catatan</Label><Input name="note" placeholder="Opsional" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPlanDialog(false)}>Batal</Button>
              <Button type="submit" disabled={!planPortfolioId || addPlanMutation.isPending}>Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Edit Rencana ──────────────────────────────────── */}
      <Dialog open={editPlanDialog} onOpenChange={setEditPlanDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Rencana DCA — {editingPlan?.stockCode}</DialogTitle></DialogHeader>
          {editingPlan && (
            <form key={editingPlan.id} onSubmit={handleEditPlan} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Harga</Label>
                  <Input name="targetPrice" type="number" step="any" min="0" required defaultValue={Number(editingPlan.targetPrice)} />
                </div>
                <div className="space-y-2">
                  <Label>Budget (IDR)</Label>
                  <Input name="budget" type="number" step="any" min="0" required defaultValue={Number(editingPlan.budget)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Frekuensi</Label>
                  <Select value={editPlanFreq} onValueChange={(v) => setEditPlanFreq(v ?? "monthly")}>
                    <SelectTrigger><span>{FREQ_LABEL[editPlanFreq]}</span></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Mingguan</SelectItem>
                      <SelectItem value="monthly">Bulanan</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Jadwal Berikutnya</Label>
                  <Input name="nextDate" type="date" defaultValue={editingPlan.nextDate ? new Date(editingPlan.nextDate).toISOString().split("T")[0] : ""} />
                </div>
              </div>
              <div className="space-y-2"><Label>Catatan</Label><Input name="note" defaultValue={editingPlan.note ?? ""} placeholder="Opsional" /></div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditPlanDialog(false)}>Batal</Button>
                <Button type="submit" disabled={updatePlanMutation.isPending}>Simpan</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Catat Pembelian ───────────────────────────────── */}
      <Dialog open={txDialog} onOpenChange={setTxDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Catat Pembelian DCA</DialogTitle></DialogHeader>
          <form key={txDialog ? "open" : "closed"} onSubmit={handleAddTx} className="space-y-4">
            <div className="space-y-2">
              <Label>Aset</Label>
              <Select value={txPortfolioId} onValueChange={(v) => { setTxPortfolioId(v ?? ""); setTxPlanId(""); }} required>
                <SelectTrigger>
                  <span className={!txPortfolioId ? "text-muted-foreground" : undefined}>
                    {txPortfolio ? `${txPortfolio.stockCode}${txPortfolio.platform ? ` (${txPortfolio.platform})` : ""}` : "Pilih aset..."}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {portfolios.map((p: PortfolioWithCalc) => (
                    <SelectItem key={p.id} value={p.id}>{p.stockCode}{p.platform ? ` (${p.platform})` : ""} — {p.exchange}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {plansForTxPortfolio.length > 0 && (
              <div className="space-y-2">
                <Label>Rencana DCA (opsional)</Label>
                <Select value={txPlanId} onValueChange={(v) => setTxPlanId(v ?? "")}>
                  <SelectTrigger>
                    <span className={!txPlanId ? "text-muted-foreground" : undefined}>
                      {txPlanId ? (() => {
                        const pl = plansForTxPortfolio.find((p: DcaPlan) => p.id === txPlanId);
                        return pl ? `Target ${formatCurrency(Number(pl.targetPrice))}` : txPlanId;
                      })() : "Tanpa rencana"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tanpa rencana</SelectItem>
                    {plansForTxPortfolio.map((pl: DcaPlan) => (
                      <SelectItem key={pl.id} value={pl.id}>{pl.stockCode} — Target {formatCurrency(Number(pl.targetPrice))} ({FREQ_LABEL[pl.frequency]})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Qty / Lot</Label><Input name="lot" type="number" step="any" min="0" required placeholder="10" /></div>
              <div className="space-y-2">
                <Label>Harga Beli ({txPortfolio?.currency ?? "IDR"})</Label>
                <Input name="price" type="number" step="any" min="0" required placeholder="8000" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tanggal Beli</Label>
              <Input name="buyDate" type="date" defaultValue={new Date().toISOString().split("T")[0]} />
            </div>
            <div className="space-y-2"><Label>Catatan</Label><Input name="note" placeholder="Opsional" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTxDialog(false)}>Batal</Button>
              <Button type="submit" disabled={!txPortfolioId || addTxMutation.isPending}>Catat</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
