"use client";

import { useState } from "react";
import {
  useNetWorth,
  useNetWorthSnapshots,
  useCreateSnapshot,
  useDeleteSnapshot,
  useAddAsset,
  useDeleteAsset,
  useAddLiability,
  useDeleteLiability,
} from "@/hooks/use-networth";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Trash2, Plus, Camera, TrendingUp } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import type { PortfolioWithCalc } from "@/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const ASSET_CATEGORIES = [
  { value: "cash", label: "Kas & Tabungan" },
  { value: "mutual_fund", label: "Reksa Dana" },
  { value: "property", label: "Properti" },
  { value: "other", label: "Lainnya" },
];

const LIABILITY_CATEGORIES = [
  { value: "mortgage", label: "KPR" },
  { value: "personal_loan", label: "KTA / Pinjaman Pribadi" },
  { value: "credit_card", label: "Kartu Kredit" },
  { value: "vehicle_loan", label: "Kredit Kendaraan" },
  { value: "other", label: "Lainnya" },
];

const EXCHANGE_BADGE: Record<string, string> = {
  IDX: "bg-blue-100 text-blue-700",
  US: "bg-violet-100 text-violet-700",
  CRYPTO: "bg-amber-100 text-amber-700",
};

export default function NetWorthPage() {
  const { data: networth, isLoading } = useNetWorth();
  const { data: snapshots = [] } = useNetWorthSnapshots();
  const { data: portfolios = [], isLoading: portfolioLoading } = usePortfolio();
  const { data: rateData } = useExchangeRate();
  const usdToIdr = rateData?.USDIDR ?? 16000;

  const createSnapshotMutation = useCreateSnapshot();
  const deleteSnapshotMutation = useDeleteSnapshot();
  const addAssetMutation = useAddAsset();
  const deleteAssetMutation = useDeleteAsset();
  const addLiabilityMutation = useAddLiability();
  const deleteLiabilityMutation = useDeleteLiability();

  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [liabilityDialogOpen, setLiabilityDialogOpen] = useState(false);
  const [assetCategory, setAssetCategory] = useState("");
  const [liabilityCategory, setLiabilityCategory] = useState("");

  // Nilai portfolio dalam IDR (market price jika ada, fallback ke modal)
  const portfolioValueIDR = portfolios.reduce((sum: number, p: PortfolioWithCalc) => {
    const val = p.marketValue ?? p.totalCost;
    return sum + (p.currency === "IDR" ? val : val * usdToIdr);
  }, 0);

  // Total Aset = porto investasi + aset manual yang diinput
  const manualAssetsTotal = networth?.totalAssets ?? 0;
  const totalAssetsAll = portfolioValueIDR + manualAssetsTotal;
  const totalLiabilities = networth?.totalLiabilities ?? 0;
  const netValue = totalAssetsAll - totalLiabilities;
  const isPositive = netValue >= 0;

  async function handleAddAsset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await addAssetMutation.mutateAsync({
      name: form.get("name"),
      category: assetCategory,
      value: Number(form.get("value")),
      note: form.get("note") || undefined,
    });
    setAssetDialogOpen(false);
    setAssetCategory("");
  }

  async function handleAddLiability(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await addLiabilityMutation.mutateAsync({
      name: form.get("name"),
      category: liabilityCategory,
      amount: Number(form.get("amount")),
      note: form.get("note") || undefined,
    });
    setLiabilityDialogOpen(false);
    setLiabilityCategory("");
  }

  const chartData = snapshots.map((s: {
    snapshotDate: string;
    netValue: number | string;
    totalAssets: number | string;
    totalLiabilities: number | string;
  }) => ({
    date: format(new Date(s.snapshotDate), "MMM yy", { locale: idLocale }),
    "Net Worth": Number(s.netValue),
    Aset: Number(s.totalAssets),
    Hutang: Number(s.totalLiabilities),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Net Worth</h1>
          <p className="text-muted-foreground">Total aset dikurangi total hutang</p>
        </div>
        <Button
          variant="outline"
          onClick={() => createSnapshotMutation.mutate(portfolioValueIDR)}
          disabled={createSnapshotMutation.isPending}
        >
          <Camera className="mr-2 h-4 w-4" />
          Simpan Snapshot
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {isLoading || portfolioLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Aset</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalAssetsAll)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Porto: {formatCurrency(portfolioValueIDR)} + Manual: {formatCurrency(manualAssetsTotal)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Hutang</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalLiabilities)}</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Net Worth (Aset − Hutang)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={cn("text-2xl font-bold", isPositive ? "text-primary" : "text-red-600")}>
                  {formatCurrency(netValue)}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {snapshots.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Tren Net Worth</CardTitle>
              <span className="text-xs text-muted-foreground">{snapshots.length} snapshot</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {chartData.length > 1 && (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) =>
                      v >= 1_000_000
                        ? `${(v / 1_000_000).toFixed(0)}jt`
                        : `${(v / 1000).toFixed(0)}rb`
                    }
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Line dataKey="Net Worth" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line dataKey="Aset" stroke="#10b981" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                  <Line dataKey="Hutang" stroke="#ef4444" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            )}

            {/* List snapshot dengan tombol hapus */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Riwayat Snapshot</p>
              <div className="divide-y rounded-md border">
                {[...snapshots].reverse().map((s: {
                  id: string;
                  snapshotDate: string;
                  netValue: number | string;
                  totalAssets: number | string;
                  totalLiabilities: number | string;
                }) => (
                  <div key={s.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div>
                      <span className="font-medium">
                        {format(new Date(s.snapshotDate), "dd MMM yyyy HH:mm", { locale: idLocale })}
                      </span>
                      <span className="ml-3 text-muted-foreground">
                        Aset {formatCurrency(Number(s.totalAssets))} · Hutang {formatCurrency(Number(s.totalLiabilities))}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={cn("font-semibold", Number(s.netValue) >= 0 ? "text-primary" : "text-red-600")}>
                        {formatCurrency(Number(s.netValue))}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm("Hapus snapshot ini?")) deleteSnapshotMutation.mutate(s.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="assets">
        <TabsList>
          <TabsTrigger value="assets">Aset</TabsTrigger>
          <TabsTrigger value="liabilities">Hutang</TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="space-y-4 pt-4">
          {/* === Portofolio Investasi — otomatis dari data portfolio === */}
          <div className="rounded-md border bg-muted/30 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-semibold">Portofolio Investasi</span>
                <span className="text-xs text-muted-foreground">(otomatis dari data porto)</span>
              </div>
              <span className="font-semibold text-emerald-600">{formatCurrency(portfolioValueIDR)}</span>
            </div>
            {portfolioLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : portfolios.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground">
                Belum ada data portfolio. Tambah aset di menu Portfolio.
              </p>
            ) : (
              <div className="divide-y">
                {portfolios.map((p: PortfolioWithCalc) => {
                  const val = p.marketValue ?? p.totalCost;
                  const valIDR = p.currency === "IDR" ? val : val * usdToIdr;
                  const isMarket = p.marketValue !== null;
                  return (
                    <div key={p.id} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn("text-xs px-1.5 py-0", EXCHANGE_BADGE[p.exchange])}
                        >
                          {p.exchange}
                        </Badge>
                        <span className="text-sm font-medium">{p.stockCode}</span>
                        {p.sector && (
                          <span className="text-xs text-muted-foreground">{p.sector}</span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(valIDR)}</p>
                        {p.currency === "USD" && (
                          <p className="text-xs text-muted-foreground">{formatCurrency(val, "USD")}</p>
                        )}
                        {!isMarket && (
                          <p className="text-xs text-muted-foreground">modal</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* === Aset Manual (kas, properti, reksa dana, dll) === */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground">Aset Lainnya</p>
            <Button size="sm" onClick={() => setAssetDialogOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Tambah Aset
            </Button>
          </div>

          {(networth?.assets ?? []).map((a: {
            id: string;
            name: string;
            category: string;
            value: number | string;
            note: string | null;
          }) => (
            <div key={a.id} className="flex items-center justify-between rounded-md border px-4 py-3">
              <div>
                <p className="font-medium">{a.name}</p>
                <p className="text-xs text-muted-foreground">
                  {ASSET_CATEGORIES.find((c) => c.value === a.category)?.label ?? a.category}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-semibold text-emerald-600">{formatCurrency(Number(a.value))}</p>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => deleteAssetMutation.mutate(a.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {(networth?.assets ?? []).length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Belum ada aset lainnya. Tambahkan kas, properti, reksa dana, dll.
            </p>
          )}
        </TabsContent>

        <TabsContent value="liabilities" className="space-y-3 pt-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setLiabilityDialogOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Tambah Hutang
            </Button>
          </div>
          {(networth?.liabilities ?? []).map((l: {
            id: string;
            name: string;
            category: string;
            amount: number | string;
            note: string | null;
          }) => (
            <div key={l.id} className="flex items-center justify-between rounded-md border px-4 py-3">
              <div>
                <p className="font-medium">{l.name}</p>
                <p className="text-xs text-muted-foreground">
                  {LIABILITY_CATEGORIES.find((c) => c.value === l.category)?.label ?? l.category}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-semibold text-red-600">{formatCurrency(Number(l.amount))}</p>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => deleteLiabilityMutation.mutate(l.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {(networth?.liabilities ?? []).length === 0 && (
            <p className="py-8 text-center text-muted-foreground">Belum ada data hutang.</p>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={assetDialogOpen} onOpenChange={setAssetDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tambah Aset Lainnya</DialogTitle>
          </DialogHeader>
          <form key={assetDialogOpen ? "open" : "closed"} onSubmit={handleAddAsset} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Aset</Label>
              <Input name="name" placeholder="BCA Tabungan" required />
            </div>
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={assetCategory} onValueChange={(v) => setAssetCategory(v ?? "")} required>
                <SelectTrigger>
                  <span className={!assetCategory ? "text-muted-foreground" : undefined}>
                    {ASSET_CATEGORIES.find((c) => c.value === assetCategory)?.label ?? "Pilih kategori..."}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {ASSET_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nilai (Rp)</Label>
              <Input name="value" type="number" min={0} required />
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Input name="note" placeholder="Opsional" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAssetDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={!assetCategory || addAssetMutation.isPending}>Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={liabilityDialogOpen} onOpenChange={setLiabilityDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tambah Hutang</DialogTitle>
          </DialogHeader>
          <form key={liabilityDialogOpen ? "open" : "closed"} onSubmit={handleAddLiability} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Hutang</Label>
              <Input name="name" placeholder="KPR BCA" required />
            </div>
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={liabilityCategory} onValueChange={(v) => setLiabilityCategory(v ?? "")} required>
                <SelectTrigger>
                  <span className={!liabilityCategory ? "text-muted-foreground" : undefined}>
                    {LIABILITY_CATEGORIES.find((c) => c.value === liabilityCategory)?.label ?? "Pilih kategori..."}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {LIABILITY_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Jumlah (Rp)</Label>
              <Input name="amount" type="number" min={0} required />
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Input name="note" placeholder="Opsional" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLiabilityDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={!liabilityCategory || addLiabilityMutation.isPending}>Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
