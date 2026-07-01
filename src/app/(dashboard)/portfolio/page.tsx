"use client";

import { useState } from "react";
import {
  usePortfolio,
  useAddPortfolio,
  useUpdatePortfolio,
  useDeletePortfolio,
} from "@/hooks/use-portfolio";
import { useSaleTransactions, useSellPortfolio, useDeleteSale } from "@/hooks/use-sales";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { PortfolioSummaryCards } from "@/components/features/portfolio/summary-cards";
import { PortfolioTable } from "@/components/features/portfolio/portfolio-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Plus, Download, TrendingDown, TrendingUp, LayoutList, History, Trash2, ArrowUpDown,
} from "lucide-react";
import type { PortfolioWithCalc, Exchange, Currency, SaleTransaction } from "@/types";
import {
  calcAvgPrice, calcUnits, formatCurrency, formatPercent,
  getUnitLabel, exportToCSV, cn,
} from "@/lib/utils";
import { EXCHANGE_BADGE } from "@/lib/constants";

const EXCHANGE_OPTIONS: { value: Exchange; label: string; currency: Currency; hint: string }[] = [
  { value: "IDX",    label: "IDX (Bursa Indonesia)",  currency: "IDR", hint: "Contoh: BBCA, TLKM, GOTO" },
  { value: "US",     label: "US Stock (NYSE/NASDAQ)", currency: "USD", hint: "Contoh: AAPL, GOOGL, TSLA" },
  { value: "CRYPTO", label: "Crypto",                 currency: "USD", hint: "Contoh: BTC, ETH, SOL" },
];

type ActiveTab = "active" | "history";

export default function PortfolioPage() {
  const { data: portfolios = [], isLoading } = usePortfolio();
  const { data: sales = [] } = useSaleTransactions();
  const { data: rateData } = useExchangeRate();
  const usdToIdr = rateData?.USDIDR ?? 16000;

  const addMutation    = useAddPortfolio();
  const updateMutation = useUpdatePortfolio();
  const deleteMutation = useDeletePortfolio();
  const sellMutation   = useSellPortfolio();
  const deleteSaleMutation = useDeleteSale();

  const [activeTab, setActiveTab] = useState<ActiveTab>("active");

  // Add/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing]       = useState<PortfolioWithCalc | null>(null);
  const [exchange, setExchange]     = useState<Exchange>("IDX");
  const [filterExchange, setFilterExchange] = useState<string>("ALL");
  const [simNewLot, setSimNewLot]   = useState("");
  const [simNewPrice, setSimNewPrice] = useState("");
  const [formError, setFormError]   = useState("");

  // Sell dialog
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [selling, setSelling]               = useState<PortfolioWithCalc | null>(null);
  const [sellLot, setSellLot]               = useState("");
  const [sellPrice, setSellPrice]           = useState("");
  const [sellError, setSellError]           = useState("");

  // Histori jual filter/sort
  const [saleSearch, setSaleSearch]             = useState("");
  const [saleExFilter, setSaleExFilter]         = useState("ALL");
  const [salePnlFilter, setSalePnlFilter]       = useState("ALL");
  const [saleSortBy, setSaleSortBy]             = useState("date_desc");

  const selectedExchangeOpt = EXCHANGE_OPTIONS.find((e) => e.value === exchange)!;
  const unitLabel = getUnitLabel(exchange);

  function openAdd() {
    setEditing(null);
    setExchange("IDX");
    setSimNewLot("");
    setSimNewPrice("");
    setFormError("");
    setDialogOpen(true);
  }

  function openEdit(p: PortfolioWithCalc) {
    setEditing(p);
    setExchange(p.exchange);
    setSimNewLot("");
    setSimNewPrice("");
    setFormError("");
    setDialogOpen(true);
  }

  function openSell(p: PortfolioWithCalc) {
    setSelling(p);
    setSellLot("");
    setSellPrice(p.marketPrice ? String(p.marketPrice) : "");
    setSellError("");
    setSellDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    const form = new FormData(e.currentTarget);

    const lot      = Number(form.get("lot"));
    const avgPrice = Number(form.get("avgPrice"));

    if (!lot || lot <= 0)           { setFormError("Jumlah harus lebih dari 0"); return; }
    if (!avgPrice || avgPrice <= 0) { setFormError("Harga beli harus lebih dari 0"); return; }

    const purchaseDateRaw = (form.get("purchaseDate") as string) || null;

    const payload = {
      stockCode:    editing ? editing.stockCode : (form.get("stockCode") as string),
      lot,
      avgPrice,
      exchange,
      currency:     selectedExchangeOpt.currency,
      platform:     (form.get("platform") as string) || "",
      sector:       (form.get("sector") as string) || undefined,
      note:         (form.get("note") as string) || undefined,
      purchaseDate: purchaseDateRaw,
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, ...payload });
      } else {
        await addMutation.mutateAsync(payload);
      }
      setDialogOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Terjadi kesalahan, coba lagi.");
    }
  }

  async function handleSell(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selling) return;
    setSellError("");
    const lotNum   = Number(sellLot);
    const priceNum = Number(sellPrice);
    if (!lotNum || lotNum <= 0)          { setSellError("Jumlah jual harus lebih dari 0"); return; }
    if (!priceNum || priceNum <= 0)      { setSellError("Harga jual harus lebih dari 0"); return; }
    if (lotNum > selling.lot + 0.000001) { setSellError(`Maksimal: ${selling.lot} ${getUnitLabel(selling.exchange)}`); return; }

    try {
      await sellMutation.mutateAsync({ portfolioId: selling.id, lotSold: lotNum, salePrice: priceNum });
      setSellDialogOpen(false);
    } catch (err) {
      setSellError(err instanceof Error ? err.message : "Terjadi kesalahan");
    }
  }

  async function handleDelete(id: string) {
    if (confirm("Hapus posisi ini?")) await deleteMutation.mutateAsync(id);
  }

  const simResult =
    editing && simNewLot && simNewPrice
      ? calcAvgPrice(editing.lot, editing.avgPrice, Number(simNewLot), Number(simNewPrice))
      : null;

  const sellPreview = (() => {
    if (!selling || !sellLot || !sellPrice) return null;
    const lotNum   = Number(sellLot);
    const priceNum = Number(sellPrice);
    if (!lotNum || !priceNum) return null;
    const units    = calcUnits(lotNum, selling.exchange);
    const proceeds = units * priceNum;
    const cost     = units * selling.avgPrice;
    const pnl      = proceeds - cost;
    const pnlPct   = cost > 0 ? (pnl / cost) * 100 : 0;
    return { proceeds, cost, pnl, pnlPct };
  })();

  async function handleDeleteSale(id: string) {
    if (confirm("Hapus histori jual ini?")) await deleteSaleMutation.mutateAsync(id);
  }

  const filteredSales = (sales as SaleTransaction[])
    .filter((t) => {
      if (saleSearch && !t.stockCode.toLowerCase().includes(saleSearch.toLowerCase())) return false;
      if (saleExFilter !== "ALL" && t.exchange !== saleExFilter) return false;
      if (salePnlFilter === "profit" && Number(t.realizedPnl) < 0) return false;
      if (salePnlFilter === "loss" && Number(t.realizedPnl) >= 0) return false;
      return true;
    })
    .sort((a, b) => {
      if (saleSortBy === "date_desc") return new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime();
      if (saleSortBy === "date_asc") return new Date(a.saleDate).getTime() - new Date(b.saleDate).getTime();
      if (saleSortBy === "pnl_desc") return Number(b.realizedPnl) - Number(a.realizedPnl);
      if (saleSortBy === "pnl_asc") return Number(a.realizedPnl) - Number(b.realizedPnl);
      return 0;
    });

  const totalRealizedPnlIDR = (sales as SaleTransaction[]).reduce((s, t) => {
    const pnl = Number(t.realizedPnl);
    return s + (t.currency === "IDR" ? pnl : pnl * usdToIdr);
  }, 0);

  const filteredPortfolios = filterExchange === "ALL"
    ? portfolios
    : portfolios.filter((p: PortfolioWithCalc) => p.exchange === filterExchange);

  const TABS: { id: ActiveTab; label: string; count: number; icon: React.ReactNode }[] = [
    { id: "active",  label: "Posisi Aktif", count: portfolios.length, icon: <LayoutList className="h-4 w-4" /> },
    { id: "history", label: "Histori Jual", count: sales.length,      icon: <History className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Portfolio</h1>
          <p className="text-muted-foreground">Saham IDX, US Stocks &amp; Crypto</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              exportToCSV(
                `portfolio-${new Date().toISOString().slice(0, 10)}.csv`,
                portfolios.map((p: PortfolioWithCalc) => ({
                  Kode: p.stockCode, Exchange: p.exchange, Platform: p.platform,
                  Lot: p.lot, "Avg Price": p.avgPrice, "Harga Pasar": p.marketPrice ?? "",
                  "Nilai Pasar": p.marketValue ?? "", "P&L": p.unrealizedPnl ?? "",
                  "P&L %": p.unrealizedPnlPct?.toFixed(2) ?? "",
                  "CAGR %": p.cagr?.toFixed(2) ?? "",
                  "Tgl Beli": p.purchaseDate ? p.purchaseDate.slice(0, 10) : "",
                  Sektor: p.sector ?? "", Catatan: p.note ?? "",
                }))
              )
            }
            disabled={portfolios.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Aset
          </Button>
        </div>
      </div>

      <PortfolioSummaryCards portfolios={portfolios} usdToIdr={usdToIdr} />

      {/* ── Tab Navigation (underline style) ────────────────────── */}
      <div className="border-b">
        <nav className="flex">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors select-none",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.icon}
                {tab.label}
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none",
                  active
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}>
                  {tab.count}
                </span>
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Posisi Aktif ──────────────────────────────────────────── */}
      {activeTab === "active" && (
        <div className="space-y-4">
          {!isLoading && portfolios.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {(["ALL", "IDX", "US", "CRYPTO"] as const).map((ex) => {
                const count = ex === "ALL"
                  ? portfolios.length
                  : portfolios.filter((p: PortfolioWithCalc) => p.exchange === ex).length;
                if (ex !== "ALL" && count === 0) return null;
                const active = filterExchange === ex;
                const colorMap: Record<string, string> = {
                  IDX:    "border-blue-300 text-blue-700",
                  US:     "border-violet-300 text-violet-700",
                  CRYPTO: "border-amber-300 text-amber-700",
                };
                return (
                  <button
                    key={ex}
                    onClick={() => setFilterExchange(ex)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-all",
                      active
                        ? ex === "ALL"
                          ? "border-foreground bg-foreground text-background"
                          : `${colorMap[ex]} bg-white shadow-sm`
                        : "border-muted-foreground/25 text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground"
                    )}
                  >
                    {ex === "ALL" ? "Semua" : ex}
                    <span className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none bg-muted/80"
                    )}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <PortfolioTable
            portfolios={filteredPortfolios}
            isLoading={isLoading}
            onEdit={openEdit}
            onDelete={handleDelete}
            onSell={openSell}
          />
        </div>
      )}

      {/* ── Histori Jual ──────────────────────────────────────────── */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {/* Summary cards */}
          {sales.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Realized P&L (IDR)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={cn("text-2xl font-bold", totalRealizedPnlIDR >= 0 ? "text-emerald-600" : "text-red-600")}>
                    {totalRealizedPnlIDR >= 0 ? "+" : ""}{formatCurrency(totalRealizedPnlIDR)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Transaksi Jual</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{sales.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Menang / Kalah</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    <span className="text-emerald-600">
                      {(sales as SaleTransaction[]).filter((t) => Number(t.realizedPnl) >= 0).length}
                    </span>
                    <span className="text-muted-foreground mx-1">/</span>
                    <span className="text-red-600">
                      {(sales as SaleTransaction[]).filter((t) => Number(t.realizedPnl) < 0).length}
                    </span>
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filter & sort bar */}
          {sales.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                placeholder="Cari kode aset..."
                value={saleSearch}
                onChange={(e) => setSaleSearch(e.target.value)}
                className="h-8 w-40 text-sm"
              />
              <Select value={saleExFilter} onValueChange={(v) => setSaleExFilter(v ?? "ALL")}>
                <SelectTrigger className="h-8 w-28 text-sm">
                  <span>{saleExFilter === "ALL" ? "Semua Pasar" : saleExFilter}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Pasar</SelectItem>
                  <SelectItem value="IDX">IDX</SelectItem>
                  <SelectItem value="US">US</SelectItem>
                  <SelectItem value="CRYPTO">Crypto</SelectItem>
                </SelectContent>
              </Select>
              <Select value={salePnlFilter} onValueChange={(v) => setSalePnlFilter(v ?? "ALL")}>
                <SelectTrigger className="h-8 w-28 text-sm">
                  <span>
                    {salePnlFilter === "ALL" ? "Semua P&L" : salePnlFilter === "profit" ? "Untung" : "Rugi"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua P&L</SelectItem>
                  <SelectItem value="profit">Untung</SelectItem>
                  <SelectItem value="loss">Rugi</SelectItem>
                </SelectContent>
              </Select>
              <Select value={saleSortBy} onValueChange={(v) => setSaleSortBy(v ?? "date_desc")}>
                <SelectTrigger className="h-8 w-36 text-sm">
                  <ArrowUpDown className="mr-1.5 h-3 w-3" />
                  <span>
                    {saleSortBy === "date_desc" ? "Terbaru" :
                     saleSortBy === "date_asc"  ? "Terlama" :
                     saleSortBy === "pnl_desc"  ? "P&L Terbesar" : "P&L Terkecil"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date_desc">Terbaru</SelectItem>
                  <SelectItem value="date_asc">Terlama</SelectItem>
                  <SelectItem value="pnl_desc">P&L Terbesar</SelectItem>
                  <SelectItem value="pnl_asc">P&L Terkecil</SelectItem>
                </SelectContent>
              </Select>
              {filteredSales.length !== sales.length && (
                <span className="text-xs text-muted-foreground">
                  {filteredSales.length} dari {sales.length} transaksi
                </span>
              )}
            </div>
          )}

          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Aset</TableHead>
                  <TableHead className="text-right">Qty Jual</TableHead>
                  <TableHead className="text-right">Harga Jual</TableHead>
                  <TableHead className="text-right">Harga Modal</TableHead>
                  <TableHead className="text-right">Proceeds</TableHead>
                  <TableHead className="text-right">Realized P&L</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <History className="h-8 w-8 opacity-30" />
                        <p className="font-medium">Belum ada histori jual</p>
                        <p className="text-sm">
                          Klik ikon{" "}
                          <TrendingDown className="inline h-3.5 w-3.5 text-amber-600" />{" "}
                          di tabel posisi aktif untuk mencatat penjualan.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                      Tidak ada transaksi yang sesuai filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSales.map((t) => {
                    const pnl      = Number(t.realizedPnl);
                    const proceeds = Number(t.totalProceeds);
                    const cost     = Number(t.totalCost);
                    const pnlPct   = cost > 0 ? (pnl / cost) * 100 : 0;
                    const currency = t.currency as "IDR" | "USD";
                    return (
                      <TableRow key={t.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div>
                              <span className="font-semibold">{t.stockCode}</span>
                              {t.platform && (
                                <p className="text-xs text-muted-foreground">{t.platform}</p>
                              )}
                            </div>
                            <Badge variant="outline" className={cn("text-xs px-1.5 py-0", EXCHANGE_BADGE[t.exchange])}>
                              {t.exchange}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {Number(t.lotSold)} {getUnitLabel(t.exchange)}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(t.salePrice), currency)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(Number(t.avgCostPrice), currency)}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(proceeds, currency)}</TableCell>
                        <TableCell className={cn("text-right font-semibold", pnl >= 0 ? "text-emerald-600" : "text-red-600")}>
                          <div>
                            {pnl >= 0 ? "+" : ""}{formatCurrency(pnl, currency)}
                            <p className="text-xs font-normal">{formatPercent(pnlPct)}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(t.saleDate).toLocaleDateString("id-ID")}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteSale(t.id)}
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
        </div>
      )}

      {/* ── Dialog Tambah/Edit ──────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.stockCode}` : "Tambah Aset"}</DialogTitle>
          </DialogHeader>

          <form key={editing?.id ?? "new"} onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Pasar / Exchange</Label>
              <Select
                value={exchange}
                onValueChange={(v) => setExchange((v ?? "IDX") as Exchange)}
                disabled={!!editing}
              >
                <SelectTrigger>
                  <span>{EXCHANGE_OPTIONS.find((o) => o.value === exchange)?.label ?? exchange}</span>
                </SelectTrigger>
                <SelectContent>
                  {EXCHANGE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{selectedExchangeOpt.hint}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{exchange === "IDX" ? "Kode Saham" : exchange === "US" ? "Ticker" : "Symbol"}</Label>
                <Input
                  name="stockCode"
                  defaultValue={editing?.stockCode}
                  placeholder={exchange === "IDX" ? "BBCA" : exchange === "US" ? "AAPL" : "BTC"}
                  required
                  disabled={!!editing}
                  className="uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label>Platform / Broker</Label>
                <Input
                  name="platform"
                  defaultValue={editing?.platform ?? ""}
                  placeholder={exchange === "CRYPTO" ? "Hyperliquid" : exchange === "US" ? "IBKR" : "Mandiri Sekuritas"}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sektor / Kategori</Label>
                <Input
                  name="sector"
                  defaultValue={editing?.sector ?? ""}
                  placeholder={exchange === "CRYPTO" ? "Layer 1" : exchange === "US" ? "Tech" : "Perbankan"}
                />
              </div>
              <div className="space-y-2">
                <Label>Catatan</Label>
                <Input name="note" defaultValue={editing?.note ?? ""} placeholder="Opsional" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{exchange === "IDX" ? "Jumlah Lot" : exchange === "US" ? "Jumlah Shares" : "Jumlah Unit"}</Label>
                <Input name="lot" type="number" min="0" step="any" defaultValue={editing?.lot} required />
                {exchange === "IDX" && (
                  <p className="text-xs text-muted-foreground">1 lot = 100 lembar</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Avg Price ({selectedExchangeOpt.currency}/{exchange === "IDX" ? "lembar" : unitLabel})</Label>
                <Input name="avgPrice" type="number" min="0" step="any" defaultValue={editing?.avgPrice} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                Tanggal Beli
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                  CAGR
                </span>
              </Label>
              <Input
                name="purchaseDate"
                type="date"
                defaultValue={editing?.purchaseDate ? editing.purchaseDate.slice(0, 10) : ""}
                max={new Date().toISOString().slice(0, 10)}
              />
              <p className="text-xs text-muted-foreground">
                Isi tanggal Anda benar-benar membeli aset ini — digunakan untuk menghitung CAGR.
              </p>
            </div>

            {editing && (
              <div className="rounded-md border bg-muted/40 p-3 space-y-3">
                <p className="text-sm font-medium">Simulasi DCA</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">{exchange === "IDX" ? "Lot baru" : "Qty baru"}</Label>
                    <Input
                      type="number" min="0" step="any"
                      value={simNewLot}
                      onChange={(e) => setSimNewLot(e.target.value)}
                      placeholder={exchange === "IDX" ? "10" : "5"}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Harga ({editing.currency})</Label>
                    <Input
                      type="number" step="0.00000001"
                      value={simNewPrice}
                      onChange={(e) => setSimNewPrice(e.target.value)}
                      placeholder={editing.currency === "USD" ? "150.00" : "8000"}
                    />
                  </div>
                </div>
                {simResult && (
                  <p className="text-sm">
                    Avg baru:{" "}
                    <span className="font-semibold text-primary">{formatCurrency(simResult, editing.currency)}</span>
                    {" "}· Total qty:{" "}
                    <span className="font-semibold">{editing.lot + Number(simNewLot)} {unitLabel}</span>
                  </p>
                )}
              </div>
            )}

            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={addMutation.isPending || updateMutation.isPending}>
                {editing ? "Simpan" : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Jual ─────────────────────────────────────────── */}
      <Dialog open={sellDialogOpen} onOpenChange={setSellDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-amber-600" />
              Jual {selling?.stockCode}
            </DialogTitle>
          </DialogHeader>
          {selling && (
            <form key={selling.id + "-sell"} onSubmit={handleSell} className="space-y-4">
              <div className="rounded-md bg-muted/40 px-3 py-2 text-sm space-y-1">
                <p>
                  Posisi: <b>{selling.lot} {getUnitLabel(selling.exchange)}</b>
                  {" "}· Avg: <b>{formatCurrency(selling.avgPrice, selling.currency)}</b>
                </p>
                {selling.marketPrice && (
                  <p>Harga pasar: <b>{formatCurrency(selling.marketPrice, selling.currency)}</b></p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{selling.exchange === "IDX" ? "Lot dijual" : "Unit dijual"}</Label>
                  <Input
                    type="number" step="any" min="0" max={selling.lot}
                    value={sellLot}
                    onChange={(e) => setSellLot(e.target.value)}
                    placeholder={selling.exchange === "IDX" ? "5" : "0.1"}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Maks: {selling.lot}</p>
                </div>
                <div className="space-y-2">
                  <Label>
                    Harga jual ({selling.currency}/{selling.exchange === "IDX" ? "lembar" : getUnitLabel(selling.exchange)})
                  </Label>
                  <Input
                    type="number" step="any" min="0"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(e.target.value)}
                    required
                  />
                </div>
              </div>

              {sellPreview && (
                <div className={cn(
                  "rounded-md px-3 py-2 text-sm space-y-1",
                  sellPreview.pnl >= 0
                    ? "bg-emerald-50 border border-emerald-200"
                    : "bg-red-50 border border-red-200"
                )}>
                  <div className="flex items-center gap-1.5 font-medium">
                    {sellPreview.pnl >= 0
                      ? <TrendingUp className="h-4 w-4 text-emerald-600" />
                      : <TrendingDown className="h-4 w-4 text-red-600" />}
                    <span className={sellPreview.pnl >= 0 ? "text-emerald-700" : "text-red-700"}>
                      Realized P&L:{" "}
                      {sellPreview.pnl >= 0 ? "+" : ""}{formatCurrency(sellPreview.pnl, selling.currency)}
                      <span className="ml-1 font-normal">({formatPercent(sellPreview.pnlPct)})</span>
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Proceeds: {formatCurrency(sellPreview.proceeds, selling.currency)}
                    {" "}· Modal: {formatCurrency(sellPreview.cost, selling.currency)}
                  </p>
                </div>
              )}

              {sellError && <p className="text-sm text-destructive">{sellError}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setSellDialogOpen(false)}>Batal</Button>
                <Button
                  type="submit"
                  disabled={sellMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Konfirmasi Jual
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
