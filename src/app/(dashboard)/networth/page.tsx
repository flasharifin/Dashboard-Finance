"use client";

import { useState, useEffect, useRef } from "react";
import {
  useNetWorth,
  useNetWorthSnapshots,
  useCreateSnapshot,
  useDeleteSnapshot,
  useAddAsset,
  useUpdateAsset,
  useDeleteAsset,
  useAddLiability,
  useUpdateLiability,
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
import { Trash2, Plus, Camera, TrendingUp, Pencil, Wallet, CreditCard, Target } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import type { PortfolioWithCalc } from "@/types";
import { GoalTab } from "@/components/features/networth/goal-tab";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
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

type Asset = { id: string; name: string; category: string; value: number | string; note: string | null };
type Liability = { id: string; name: string; category: string; amount: number | string; note: string | null };
type Snapshot = { id: string; snapshotDate: string; netValue: number | string; totalAssets: number | string; totalLiabilities: number | string; portfolioValue: number | string | null; benchmarkIhsg: number | string | null; benchmarkSp500: number | string | null };

// Interval snapshot otomatis: 1 = setiap bulan, 2 = setiap 2 bulan, dst
const AUTO_SNAPSHOT_INTERVAL_MONTHS = 1;

export default function NetWorthPage() {
  const { data: networth, isLoading } = useNetWorth();
  const { data: snapshots = [], isLoading: snapshotsLoading } = useNetWorthSnapshots();
  const { data: portfolios = [], isLoading: portfolioLoading } = usePortfolio();
  const { data: rateData } = useExchangeRate();
  const usdToIdr = rateData?.USDIDR ?? 16000;

  const createSnapshotMutation = useCreateSnapshot();
  const deleteSnapshotMutation = useDeleteSnapshot();
  const addAssetMutation = useAddAsset();
  const updateAssetMutation = useUpdateAsset();
  const deleteAssetMutation = useDeleteAsset();
  const addLiabilityMutation = useAddLiability();
  const updateLiabilityMutation = useUpdateLiability();
  const deleteLiabilityMutation = useDeleteLiability();

  const [activeTab, setActiveTab] = useState<"assets" | "liabilities" | "goal">("assets");

  // Add dialogs
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [liabilityDialogOpen, setLiabilityDialogOpen] = useState(false);
  const [assetCategory, setAssetCategory] = useState("");
  const [liabilityCategory, setLiabilityCategory] = useState("");

  // Edit dialogs
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [editAssetCategory, setEditAssetCategory] = useState("");
  const [editLiability, setEditLiability] = useState<Liability | null>(null);
  const [editLiabilityCategory, setEditLiabilityCategory] = useState("");

  // Prevent duplicate auto-snapshot in one page session
  const autoSnapshotDone = useRef(false);

  // Nilai portfolio dalam IDR
  const portfolioValueIDR = portfolios.reduce((sum: number, p: PortfolioWithCalc) => {
    const val = p.marketValue ?? p.totalCost;
    return sum + (p.currency === "IDR" ? val : val * usdToIdr);
  }, 0);

  const manualAssetsTotal = networth?.totalAssets ?? 0;
  const totalAssetsAll = portfolioValueIDR + manualAssetsTotal;
  const totalLiabilities = networth?.totalLiabilities ?? 0;
  const netValue = totalAssetsAll - totalLiabilities;
  const isPositive = netValue >= 0;

  // Auto snapshot: hanya berjalan setelah snapshots & portfolio selesai di-fetch
  // Interval dikontrol oleh AUTO_SNAPSHOT_INTERVAL_MONTHS di atas
  useEffect(() => {
    if (autoSnapshotDone.current) return;
    // Tunggu semua data selesai loading sebelum mengecek
    if (snapshotsLoading || portfolioLoading || !rateData) return;
    if (createSnapshotMutation.isPending) return;

    const now = new Date();
    // Ambil snapshot terbaru (array terurut ascending dari API)
    const lastSnapshot = snapshots.length > 0
      ? new Date(snapshots[snapshots.length - 1].snapshotDate)
      : null;

    // Hitung selisih bulan kalender (bukan 30 hari)
    const monthsSince = lastSnapshot
      ? (now.getFullYear() - lastSnapshot.getFullYear()) * 12 +
        (now.getMonth() - lastSnapshot.getMonth())
      : Infinity;

    if (monthsSince >= AUTO_SNAPSHOT_INTERVAL_MONTHS) {
      autoSnapshotDone.current = true;
      createSnapshotMutation.mutate(portfolioValueIDR);
    }
  }, [snapshotsLoading, portfolioLoading, portfolioValueIDR, rateData]); // eslint-disable-line react-hooks/exhaustive-deps

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

  async function handleEditAsset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editAsset) return;
    const form = new FormData(e.currentTarget);
    await updateAssetMutation.mutateAsync({
      id: editAsset.id,
      name: form.get("name"),
      category: editAssetCategory,
      value: Number(form.get("value")),
      note: form.get("note") || undefined,
    });
    setEditAsset(null);
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

  async function handleEditLiability(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editLiability) return;
    const form = new FormData(e.currentTarget);
    await updateLiabilityMutation.mutateAsync({
      id: editLiability.id,
      name: form.get("name"),
      category: editLiabilityCategory,
      amount: Number(form.get("amount")),
      note: form.get("note") || undefined,
    });
    setEditLiability(null);
  }

  const showPortoLine = (snapshots as Snapshot[]).some((s) => s.portfolioValue != null);
  const hasIhsg = (snapshots as Snapshot[]).some((s) => s.benchmarkIhsg != null);
  const hasSp500 = (snapshots as Snapshot[]).some((s) => s.benchmarkSp500 != null);

  const firstIhsg  = (snapshots as Snapshot[]).find((s) => s.benchmarkIhsg  != null)?.benchmarkIhsg;
  const firstSp500 = (snapshots as Snapshot[]).find((s) => s.benchmarkSp500 != null)?.benchmarkSp500;

  // Pilih baseline benchmark: net worth → portfolio → total aset (prioritas nilai positif)
  const firstSnap     = snapshots.length > 0 ? (snapshots as Snapshot[])[0] : null;
  const firstNW       = firstSnap ? Number(firstSnap.netValue)           : 0;
  const firstPorto    = firstSnap ? Number(firstSnap.portfolioValue ?? 0) : 0;
  const firstAssets   = firstSnap ? Number(firstSnap.totalAssets)         : 0;
  const benchmarkBase = firstNW > 0 ? firstNW : firstPorto > 0 ? firstPorto : firstAssets > 0 ? firstAssets : null;

  const chartData = (snapshots as Snapshot[]).map((s) => ({
    date: format(new Date(s.snapshotDate), "MMM yy", { locale: idLocale }),
    "Net Worth": Number(s.netValue),
    Aset: Number(s.totalAssets),
    Hutang: Number(s.totalLiabilities),
    ...(s.portfolioValue != null ? { Porto: Number(s.portfolioValue) } : {}),
    ...(benchmarkBase && hasIhsg && s.benchmarkIhsg != null && firstIhsg != null
      ? { IHSG: (Number(s.benchmarkIhsg) / Number(firstIhsg)) * benchmarkBase }
      : {}),
    ...(benchmarkBase && hasSp500 && s.benchmarkSp500 != null && firstSp500 != null
      ? { SP500: (Number(s.benchmarkSp500) / Number(firstSp500)) * benchmarkBase }
      : {}),
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
                <CardTitle className="text-sm font-medium text-muted-foreground">Net Worth (Aset − Hutang)</CardTitle>
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
                      v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}jt` : `${(v / 1000).toFixed(0)}rb`
                    }
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                    formatter={(value) =>
                      value === "Net Worth" ? "Net Worth"
                      : value === "Porto" ? "Portofolio"
                      : value
                    }
                  />
                  <Line dataKey="Net Worth" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line dataKey="Aset" stroke="#10b981" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                  <Line dataKey="Hutang" stroke="#ef4444" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                  <Line dataKey="Porto" stroke="#f97316" strokeWidth={1.5} dot={false} strokeDasharray="2 2" />
                  <Line dataKey="IHSG" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="6 2" />
                  <Line dataKey="SP500" stroke="#06b6d4" strokeWidth={1.5} dot={false} strokeDasharray="6 2" />
                </LineChart>
              </ResponsiveContainer>
            )}

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Riwayat Snapshot</p>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted border-b">
                      <th className="text-left px-3 py-2 font-semibold text-slate-900 dark:text-slate-100">Tanggal</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-900 dark:text-slate-100 hidden sm:table-cell">Total Aset</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-900 dark:text-slate-100 hidden sm:table-cell">Hutang</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-900 dark:text-slate-100">Net Worth</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {[...(snapshots as Snapshot[])].reverse().map((s) => {
                      const nw = Number(s.netValue);
                      return (
                        <tr key={s.id} className="hover:bg-muted/40 transition-colors">
                          <td className="px-3 py-2.5 text-foreground font-semibold whitespace-nowrap">
                            {format(new Date(s.snapshotDate), "dd MMM yyyy", { locale: idLocale })}
                            <span className="block text-xs text-muted-foreground">
                              {format(new Date(s.snapshotDate), "HH:mm")}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right text-slate-700 dark:text-slate-300 hidden sm:table-cell">
                            {formatCurrency(Number(s.totalAssets))}
                          </td>
                          <td className="px-3 py-2.5 text-right text-red-600 dark:text-red-400 hidden sm:table-cell">
                            {formatCurrency(Number(s.totalLiabilities))}
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold text-foreground">
                            {formatCurrency(nw)}
                          </td>
                          <td className="px-2 py-2.5">
                            <Button
                              size="icon" variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => { if (confirm("Hapus snapshot ini?")) deleteSnapshotMutation.mutate(s.id); }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Tab Navigation (underline style) ────────────────────── */}
      <div className="border-b">
        <nav className="flex">
          {([
            {
              id: "assets" as const,
              label: "Aset",
              count: (networth?.assets ?? []).length + (portfolios.length > 0 ? 1 : 0),
              icon: <Wallet className="h-4 w-4" />,
            },
            {
              id: "liabilities" as const,
              label: "Hutang",
              count: (networth?.liabilities ?? []).length,
              icon: <CreditCard className="h-4 w-4" />,
            },
            {
              id: "goal" as const,
              label: "Goal",
              count: null,
              icon: <Target className="h-4 w-4" />,
            },
          ]).map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors select-none",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.icon}
                {tab.label}
                {tab.count != null && (
                  <span className={cn(
                    "rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none",
                    active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    {tab.count}
                  </span>
                )}
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

        {/* ── Aset Tab ─────────────────────────────────────────── */}
        {activeTab === "assets" && <div className="space-y-4 pt-2">
          <div className="rounded-md border bg-muted/30 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-semibold">Portofolio Investasi</span>
                <span className="text-xs text-muted-foreground hidden sm:inline">(otomatis dari data porto)</span>
              </div>
              <span className="font-semibold text-emerald-600">{formatCurrency(portfolioValueIDR)}</span>
            </div>
            {portfolioLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : portfolios.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground">Belum ada data portfolio.</p>
            ) : (
              <div className="divide-y">
                {portfolios.map((p: PortfolioWithCalc) => {
                  const val = p.marketValue ?? p.totalCost;
                  const valIDR = p.currency === "IDR" ? val : val * usdToIdr;
                  return (
                    <div key={p.id} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn("text-xs px-1.5 py-0", EXCHANGE_BADGE[p.exchange])}>{p.exchange}</Badge>
                        <span className="text-sm font-medium">{p.stockCode}</span>
                        {p.sector && <span className="text-xs text-muted-foreground hidden sm:inline">{p.sector}</span>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(valIDR)}</p>
                        {p.currency === "USD" && <p className="text-xs text-muted-foreground">{formatCurrency(val, "USD")}</p>}
                        {p.marketValue === null && <p className="text-xs text-muted-foreground">modal</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground">Aset Lainnya</p>
            <Button size="sm" onClick={() => setAssetDialogOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />Tambah Aset
            </Button>
          </div>

          {(networth?.assets ?? []).map((a: Asset) => (
            <div key={a.id} className="flex items-center justify-between rounded-md border px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium">{a.name}</p>
                <p className="text-xs text-muted-foreground">
                  {ASSET_CATEGORIES.find((c) => c.value === a.category)?.label ?? a.category}
                  {a.note && ` · ${a.note}`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <p className="font-semibold text-emerald-600">{formatCurrency(Number(a.value))}</p>
                <Button size="icon" variant="ghost" className="h-7 w-7"
                  onClick={() => { setEditAsset(a); setEditAssetCategory(a.category); }}>
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => deleteAssetMutation.mutate(a.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {(networth?.assets ?? []).length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">Belum ada aset lainnya.</p>
          )}
        </div>}

        {/* ── Hutang Tab ───────────────────────────────────────── */}
        {activeTab === "liabilities" && <div className="space-y-3 pt-2">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setLiabilityDialogOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />Tambah Hutang
            </Button>
          </div>
          {(networth?.liabilities ?? []).map((l: Liability) => (
            <div key={l.id} className="flex items-center justify-between rounded-md border px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium">{l.name}</p>
                <p className="text-xs text-muted-foreground">
                  {LIABILITY_CATEGORIES.find((c) => c.value === l.category)?.label ?? l.category}
                  {l.note && ` · ${l.note}`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <p className="font-semibold text-red-600">{formatCurrency(Number(l.amount))}</p>
                <Button size="icon" variant="ghost" className="h-7 w-7"
                  onClick={() => { setEditLiability(l); setEditLiabilityCategory(l.category); }}>
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => deleteLiabilityMutation.mutate(l.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {(networth?.liabilities ?? []).length === 0 && (
            <p className="py-8 text-center text-muted-foreground">Belum ada data hutang.</p>
          )}
        </div>}

        {/* ── Goal Tab ─────────────────────────────────────────── */}
        {activeTab === "goal" && <GoalTab currentNetWorth={netValue} />}

      {/* ── Dialog Tambah Aset ──────────────────────────────────── */}
      <Dialog open={assetDialogOpen} onOpenChange={setAssetDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Tambah Aset Lainnya</DialogTitle></DialogHeader>
          <form key={assetDialogOpen ? "open" : "closed"} onSubmit={handleAddAsset} className="space-y-4">
            <div className="space-y-2"><Label>Nama Aset</Label><Input name="name" placeholder="BCA Tabungan" required /></div>
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={assetCategory} onValueChange={(v) => setAssetCategory(v ?? "")} required>
                <SelectTrigger>
                  <span className={!assetCategory ? "text-muted-foreground" : undefined}>
                    {ASSET_CATEGORIES.find((c) => c.value === assetCategory)?.label ?? "Pilih kategori..."}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {ASSET_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Nilai (Rp)</Label><Input name="value" type="number" min={0} required /></div>
            <div className="space-y-2"><Label>Catatan</Label><Input name="note" placeholder="Opsional" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAssetDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={!assetCategory || addAssetMutation.isPending}>Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Edit Aset ────────────────────────────────────── */}
      <Dialog open={!!editAsset} onOpenChange={(o) => !o && setEditAsset(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Aset — {editAsset?.name}</DialogTitle></DialogHeader>
          {editAsset && (
            <form key={editAsset.id} onSubmit={handleEditAsset} className="space-y-4">
              <div className="space-y-2"><Label>Nama Aset</Label><Input name="name" defaultValue={editAsset.name} required /></div>
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select value={editAssetCategory} onValueChange={(v) => setEditAssetCategory(v ?? "")} required>
                  <SelectTrigger>
                    <span>{ASSET_CATEGORIES.find((c) => c.value === editAssetCategory)?.label ?? "Pilih..."}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Nilai (Rp)</Label><Input name="value" type="number" min={0} required defaultValue={Number(editAsset.value)} /></div>
              <div className="space-y-2"><Label>Catatan</Label><Input name="note" defaultValue={editAsset.note ?? ""} placeholder="Opsional" /></div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditAsset(null)}>Batal</Button>
                <Button type="submit" disabled={!editAssetCategory || updateAssetMutation.isPending}>Simpan</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog Tambah Hutang ─────────────────────────────────── */}
      <Dialog open={liabilityDialogOpen} onOpenChange={setLiabilityDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Tambah Hutang</DialogTitle></DialogHeader>
          <form key={liabilityDialogOpen ? "open" : "closed"} onSubmit={handleAddLiability} className="space-y-4">
            <div className="space-y-2"><Label>Nama Hutang</Label><Input name="name" placeholder="KPR BCA" required /></div>
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={liabilityCategory} onValueChange={(v) => setLiabilityCategory(v ?? "")} required>
                <SelectTrigger>
                  <span className={!liabilityCategory ? "text-muted-foreground" : undefined}>
                    {LIABILITY_CATEGORIES.find((c) => c.value === liabilityCategory)?.label ?? "Pilih kategori..."}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {LIABILITY_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Jumlah (Rp)</Label><Input name="amount" type="number" min={0} required /></div>
            <div className="space-y-2"><Label>Catatan</Label><Input name="note" placeholder="Opsional" /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLiabilityDialogOpen(false)}>Batal</Button>
              <Button type="submit" disabled={!liabilityCategory || addLiabilityMutation.isPending}>Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Edit Hutang ───────────────────────────────────── */}
      <Dialog open={!!editLiability} onOpenChange={(o) => !o && setEditLiability(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Hutang — {editLiability?.name}</DialogTitle></DialogHeader>
          {editLiability && (
            <form key={editLiability.id} onSubmit={handleEditLiability} className="space-y-4">
              <div className="space-y-2"><Label>Nama Hutang</Label><Input name="name" defaultValue={editLiability.name} required /></div>
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select value={editLiabilityCategory} onValueChange={(v) => setEditLiabilityCategory(v ?? "")} required>
                  <SelectTrigger>
                    <span>{LIABILITY_CATEGORIES.find((c) => c.value === editLiabilityCategory)?.label ?? "Pilih..."}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {LIABILITY_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Jumlah (Rp)</Label><Input name="amount" type="number" min={0} required defaultValue={Number(editLiability.amount)} /></div>
              <div className="space-y-2"><Label>Catatan</Label><Input name="note" defaultValue={editLiability.note ?? ""} placeholder="Opsional" /></div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditLiability(null)}>Batal</Button>
                <Button type="submit" disabled={!editLiabilityCategory || updateLiabilityMutation.isPending}>Simpan</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
