"use client";

import { useState, useMemo } from "react";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { useMarketHistory } from "@/hooks/use-market-history";
import type { HistoryData } from "@/hooks/use-market-history";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, cn } from "@/lib/utils";
import { EXCHANGE_BADGE } from "@/lib/constants";
import { AlertTriangle, GitBranch, Zap } from "lucide-react";
import type { PortfolioWithCalc } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "Risiko" | "Korelasi" | "Stress Test";

type RiskStats = {
  key: string;
  stockCode: string;
  exchange: string;
  weight: number;
  volatility: number | null;
  maxDrawdown: number | null;
};

type StressResult = PortfolioWithCalc & {
  valIDR: number;
  newValIDR: number;
  deltaIDR: number;
};

const TABS: Tab[] = ["Risiko", "Korelasi", "Stress Test"];

const SCENARIOS = [
  { id: "mild",   label: "Koreksi Ringan", desc: "Koreksi normal pasar",       IDX: -10, US: -8,  CRYPTO: -15 },
  { id: "bear",   label: "Bear Market",    desc: "Penurunan signifikan",        IDX: -25, US: -20, CRYPTO: -40 },
  { id: "crisis", label: "Krisis 2020",    desc: "Seperti crash COVID Mar-2020", IDX: -38, US: -34, CRYPTO: -50 },
  { id: "custom", label: "Kustom",         desc: "Atur sendiri persentase",      IDX: 0,   US: 0,   CRYPTO: 0   },
];

// ── Pure computation helpers ──────────────────────────────────────────────────

function computeStats(closes: number[]): { volatility: number | null; maxDrawdown: number | null } {
  if (closes.length < 4) return { volatility: null, maxDrawdown: null };

  const returns = closes.slice(1).map((c, i) => (c - closes[i]) / closes[i]);
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance =
    returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / (returns.length - 1);
  const volatility = Math.sqrt(variance * 252) * 100;

  let peak = closes[0];
  let maxDD = 0;
  for (const c of closes) {
    if (c > peak) peak = c;
    const dd = (peak - c) / peak;
    if (dd > maxDD) maxDD = dd;
  }

  return { volatility, maxDrawdown: maxDD * 100 };
}

function computeCorrelation(r1: number[], r2: number[]): number | null {
  const n = Math.min(r1.length, r2.length);
  if (n < 5) return null;
  const a = r1.slice(0, n);
  const b = r2.slice(0, n);
  const ma = a.reduce((s, v) => s + v, 0) / n;
  const mb = b.reduce((s, v) => s + v, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += Math.pow(a[i] - ma, 2);
    db += Math.pow(b[i] - mb, 2);
  }
  return da === 0 || db === 0 ? null : num / Math.sqrt(da * db);
}

function alignReturns(
  keys: string[],
  histories: HistoryData
): Record<string, number[]> {
  const valid = keys.filter((k) => histories[k] && histories[k]!.length > 3);
  if (valid.length < 2) return {};

  const dateSets = valid.map((k) => new Set(histories[k]!.map((p) => p.date)));
  const commonDates = [...dateSets[0]]
    .filter((d) => dateSets.every((s) => s.has(d)))
    .sort();

  if (commonDates.length < 5) return {};

  const result: Record<string, number[]> = {};
  for (const key of valid) {
    const priceMap = new Map(histories[key]!.map((p) => [p.date, p.close]));
    const prices = commonDates.map((d) => priceMap.get(d)!).filter(Boolean);
    if (prices.length < 5) continue;
    result[key] = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
  }
  return result;
}

function corrColor(r: number | null): string {
  if (r === null) return "bg-muted/50 text-muted-foreground";
  if (r > 0.7)   return "bg-emerald-600 text-white";
  if (r > 0.4)   return "bg-emerald-400 text-white";
  if (r > 0.1)   return "bg-emerald-100 text-emerald-800";
  if (r > -0.1)  return "bg-slate-100 text-slate-600";
  if (r > -0.4)  return "bg-red-100 text-red-800";
  if (r > -0.7)  return "bg-red-400 text-white";
  return "bg-red-600 text-white";
}

function volLevel(v: number | null): { label: string; cls: string } {
  if (v === null) return { label: "—", cls: "text-muted-foreground" };
  if (v < 20)    return { label: "Rendah",  cls: "text-emerald-600" };
  if (v < 50)    return { label: "Sedang",  cls: "text-amber-600" };
  return              { label: "Tinggi",  cls: "text-red-600" };
}

function ddLevel(d: number | null): { label: string; cls: string } {
  if (d === null) return { label: "—", cls: "text-muted-foreground" };
  if (d < 10)    return { label: "Rendah",  cls: "text-emerald-600" };
  if (d < 25)    return { label: "Sedang",  cls: "text-amber-600" };
  return              { label: "Tinggi",  cls: "text-red-600" };
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AnalisisPage() {
  const [tab, setTab] = useState<Tab>("Risiko");

  const { data: portfolios, isLoading: portfolioLoading } = usePortfolio();
  const { data: rateData } = useExchangeRate();
  const usdToIdr = rateData?.USDIDR ?? 16000;

  const assetKeys = useMemo(
    () => portfolios?.map((p: PortfolioWithCalc) => `${p.stockCode}:${p.exchange}`) ?? [],
    [portfolios]
  );

  const { data: histories, isLoading: historyLoading } = useMarketHistory(assetKeys);
  const isLoading = portfolioLoading || historyLoading;

  const totalValueIDR = useMemo(() => {
    if (!portfolios) return 0;
    return portfolios.reduce((s: number, p: PortfolioWithCalc) => {
      const val = p.marketValue ?? p.totalCost;
      return s + (p.currency === "IDR" ? val : val * usdToIdr);
    }, 0);
  }, [portfolios, usdToIdr]);

  const riskStats = useMemo<RiskStats[]>(() => {
    if (!portfolios || !histories) return [];
    return portfolios.map((p: PortfolioWithCalc) => {
      const key = `${p.stockCode}:${p.exchange}`;
      const closes = histories[key]?.map((h) => h.close) ?? [];
      const { volatility, maxDrawdown } = computeStats(closes);
      const valIDR = (p.marketValue ?? p.totalCost) * (p.currency === "IDR" ? 1 : usdToIdr);
      const weight = totalValueIDR > 0 ? (valIDR / totalValueIDR) * 100 : 0;
      return { key, stockCode: p.stockCode, exchange: p.exchange, weight, volatility, maxDrawdown };
    });
  }, [portfolios, histories, totalValueIDR, usdToIdr]);

  const alignedReturns = useMemo(() => {
    if (!histories) return {};
    return alignReturns(assetKeys, histories);
  }, [assetKeys, histories]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analisis Risiko</h1>
        <p className="text-muted-foreground text-sm">
          Volatilitas, korelasi, dan simulasi stress test portfolio Anda
        </p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-0 border-b">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Risiko" && (
        <RisikoTab stats={riskStats} isLoading={isLoading} />
      )}
      {tab === "Korelasi" && (
        <KorelasiTab
          keys={assetKeys}
          returns={alignedReturns}
          isLoading={isLoading}
        />
      )}
      {tab === "Stress Test" && (
        <StressTestTab
          portfolios={portfolios ?? []}
          usdToIdr={usdToIdr}
          isLoading={portfolioLoading}
        />
      )}
    </div>
  );
}

// ── Risiko Tab ────────────────────────────────────────────────────────────────

function RisikoTab({ stats, isLoading }: { stats: RiskStats[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12">
        Belum ada posisi di portfolio.
      </p>
    );
  }

  const sorted = [...stats].sort((a, b) => b.weight - a.weight);

  return (
    <div className="space-y-4">
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900">
        <CardContent className="pt-4 pb-3">
          <div className="flex gap-2 text-sm text-blue-800 dark:text-blue-300">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              Volatilitas dan Max Drawdown dihitung dari data harga 30 hari terakhir.
              Angka ini bersifat historis — bukan jaminan performa ke depan.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[580px] text-sm">
              <thead>
                <tr className="border-b bg-muted">
                  <th className="text-left px-4 py-3 font-medium text-foreground">Aset</th>
                  <th className="text-right px-4 py-3 font-medium text-foreground">Bobot</th>
                  <th className="text-right px-4 py-3 font-medium text-foreground">Volatilitas/yr</th>
                  <th className="text-right px-4 py-3 font-medium text-foreground">Max Drawdown</th>
                  <th className="text-center px-4 py-3 font-medium text-foreground">Level Risiko</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => {
                  const vl = volLevel(r.volatility);
                  const dl = ddLevel(r.maxDrawdown);
                  return (
                    <tr key={r.key} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{r.stockCode}</span>
                          <Badge
                            variant="outline"
                            className={cn("text-xs px-1.5 py-0", EXCHANGE_BADGE[r.exchange])}
                          >
                            {r.exchange}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${Math.min(r.weight, 100)}%` }}
                            />
                          </div>
                          <span className="font-medium tabular-nums">{r.weight.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {r.volatility !== null ? (
                          <span className={vl.cls}>{r.volatility.toFixed(1)}%</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">Data kurang</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {r.maxDrawdown !== null ? (
                          <span className={dl.cls}>-{r.maxDrawdown.toFixed(1)}%</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.volatility !== null ? (
                          <span
                            className={cn(
                              "inline-block px-2 py-0.5 rounded-full text-xs font-medium",
                              r.volatility < 20
                                ? "bg-emerald-100 text-emerald-700"
                                : r.volatility < 50
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                            )}
                          >
                            {vl.label}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span><strong className="text-foreground">Volatilitas/yr</strong> — std dev return harian × √252</span>
        <span><strong className="text-foreground">Max Drawdown</strong> — penurunan terbesar dari puncak (30 hari)</span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" /> &lt;20% Rendah
          <span className="inline-block w-2 h-2 rounded-full bg-amber-500 ml-1" /> 20-50% Sedang
          <span className="inline-block w-2 h-2 rounded-full bg-red-500 ml-1" /> &gt;50% Tinggi
        </span>
      </div>
    </div>
  );
}

// ── Korelasi Tab ──────────────────────────────────────────────────────────────

function KorelasiTab({
  keys,
  returns,
  isLoading,
}: {
  keys: string[];
  returns: Record<string, number[]>;
  isLoading: boolean;
}) {
  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  const validKeys = keys.filter((k) => returns[k] && returns[k].length >= 5);

  if (validKeys.length < 2) {
    return (
      <Card>
        <CardContent className="py-14 text-center">
          <GitBranch className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground font-medium">Data historis belum cukup</p>
          <p className="text-xs text-muted-foreground mt-1">
            Perlu minimal 2 aset dengan data 5 hari trading yang sama.
          </p>
        </CardContent>
      </Card>
    );
  }

  const labels = validKeys.map((k) => k.split(":")[0]);
  const exchanges = validKeys.map((k) => k.split(":")[1]);

  return (
    <div className="space-y-4">
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900">
        <CardContent className="pt-4 pb-3">
          <div className="flex gap-2 text-sm text-blue-800 dark:text-blue-300">
            <GitBranch className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              Korelasi mengukur seberapa sering dua aset bergerak bersama.{" "}
              <strong>+1</strong> = selalu searah · <strong>-1</strong> = selalu berlawanan ·{" "}
              <strong>0</strong> = tidak ada hubungan. Diversifikasi yang baik punya korelasi rendah.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">
            Matriks Korelasi — 30 hari terakhir
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-4">
          <div className="overflow-x-auto px-4">
            <table className="text-xs border-separate border-spacing-1">
              <thead>
                <tr>
                  <th className="w-20 pr-2" />
                  {validKeys.map((k, i) => (
                    <th key={k} className="text-center min-w-[68px] pb-1">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="font-semibold text-foreground">{labels[i]}</span>
                        <Badge
                          variant="outline"
                          className={cn("text-[9px] px-1 py-0 leading-3", EXCHANGE_BADGE[exchanges[i]])}
                        >
                          {exchanges[i]}
                        </Badge>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {validKeys.map((rowKey, ri) => (
                  <tr key={rowKey}>
                    <td className="pr-2 py-0.5 text-right">
                      <span className="font-semibold text-foreground">{labels[ri]}</span>
                    </td>
                    {validKeys.map((colKey, ci) => {
                      const corr =
                        ri === ci ? 1 : computeCorrelation(returns[rowKey], returns[colKey]);
                      return (
                        <td
                          key={colKey}
                          className={cn(
                            "text-center rounded px-2 py-1.5 font-semibold tabular-nums",
                            corrColor(corr)
                          )}
                          title={
                            ri === ci
                              ? "Aset yang sama"
                              : corr !== null
                              ? `Korelasi ${corr.toFixed(3)}`
                              : "Data tidak cukup"
                          }
                        >
                          {ri === ci ? "1.00" : corr !== null ? corr.toFixed(2) : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        {[
          { cls: "bg-emerald-600 text-white",  label: "> 0.7 Sangat searah" },
          { cls: "bg-emerald-100 text-emerald-800", label: "0.1 – 0.7 Searah" },
          { cls: "bg-slate-100 text-slate-600", label: "~0 Tidak berkorelasi" },
          { cls: "bg-red-100 text-red-800",    label: "-0.7 – -0.1 Berlawanan" },
          { cls: "bg-red-600 text-white",      label: "< -0.7 Sangat berlawanan" },
        ].map(({ cls, label }) => (
          <span key={label} className={cn("px-2 py-0.5 rounded font-medium", cls)}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Stress Test Tab ───────────────────────────────────────────────────────────

function StressTestTab({
  portfolios,
  usdToIdr,
  isLoading,
}: {
  portfolios: PortfolioWithCalc[];
  usdToIdr: number;
  isLoading: boolean;
}) {
  const [scenarioId, setScenarioId] = useState("mild");
  const [customDrops, setCustomDrops] = useState({ IDX: -10, US: -8, CRYPTO: -15 });

  const scenario = SCENARIOS.find((s) => s.id === scenarioId)!;
  const drops =
    scenarioId === "custom"
      ? customDrops
      : { IDX: scenario.IDX, US: scenario.US, CRYPTO: scenario.CRYPTO };

  const results = useMemo<StressResult[]>(() => {
    const sc = SCENARIOS.find((s) => s.id === scenarioId)!;
    const d =
      scenarioId === "custom"
        ? customDrops
        : { IDX: sc.IDX, US: sc.US, CRYPTO: sc.CRYPTO };

    return portfolios.map((p) => {
      const valIDR = (p.marketValue ?? p.totalCost) * (p.currency === "IDR" ? 1 : usdToIdr);
      const drop = d[p.exchange as keyof typeof d] / 100;
      const newValIDR = valIDR * (1 + drop);
      return { ...p, valIDR, newValIDR, deltaIDR: newValIDR - valIDR };
    });
  }, [portfolios, scenarioId, customDrops, usdToIdr]);

  const totalBefore = results.reduce((s, r) => s + r.valIDR, 0);
  const totalAfter  = results.reduce((s, r) => s + r.newValIDR, 0);
  const totalDelta  = totalAfter - totalBefore;
  const totalDeltaPct = totalBefore > 0 ? (totalDelta / totalBefore) * 100 : 0;

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (portfolios.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12">
        Belum ada posisi di portfolio.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900">
        <CardContent className="pt-4 pb-3">
          <div className="flex gap-2 text-sm text-amber-800 dark:text-amber-300">
            <Zap className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              Simulasi dampak jika semua aset dalam satu exchange turun secara bersamaan.
              Harga acuan adalah nilai pasar saat ini (atau modal jika harga belum tersedia).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Scenario selector */}
      <div>
        <p className="text-sm font-medium mb-2">Pilih Skenario</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => setScenarioId(s.id)}
              className={cn(
                "rounded-lg border p-3 text-left transition-all",
                scenarioId === s.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                  : "hover:bg-muted/50 hover:border-border"
              )}
            >
              <p className="text-sm font-semibold leading-tight">{s.label}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-snug">{s.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Drop % per exchange */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground">
            Asumsi Penurunan per Exchange
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-3">
            {(["IDX", "US", "CRYPTO"] as const).map((ex) => (
              <div key={ex}>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  {ex}
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    className={cn(
                      "pr-6 h-9 text-sm tabular-nums",
                      drops[ex] < 0 ? "text-red-600" : "text-emerald-600"
                    )}
                    value={drops[ex]}
                    onChange={(e) => {
                      if (scenarioId !== "custom") return;
                      setCustomDrops({ ...customDrops, [ex]: Number(e.target.value) });
                    }}
                    readOnly={scenarioId !== "custom"}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    %
                  </span>
                </div>
              </div>
            ))}
          </div>
          {scenarioId !== "custom" && (
            <p className="text-xs text-muted-foreground mt-2">
              Pilih <strong>Kustom</strong> untuk mengubah nilai.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Impact summary */}
      <Card className={cn("border-2", totalDelta < 0 ? "border-red-300 bg-red-50" : "border-emerald-300 bg-emerald-50")}>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
            <div className="flex-1">
              <p className="text-xs font-medium text-foreground/70">Nilai Portfolio Saat Ini</p>
              <p className="text-xl font-bold mt-0.5">{formatCurrency(totalBefore)}</p>
            </div>
            <div className="text-foreground/40 hidden sm:block text-xl">→</div>
            <div className="flex-1">
              <p className="text-xs font-medium text-foreground/70">Nilai Setelah Skenario</p>
              <p className={cn("text-xl font-bold mt-0.5", totalDelta < 0 ? "text-red-600" : "text-emerald-600")}>
                {formatCurrency(totalAfter)}
              </p>
            </div>
            <div className="border-t sm:border-t-0 sm:border-l pt-3 sm:pt-0 sm:pl-6">
              <p className="text-xs font-medium text-foreground/70">Estimasi Dampak</p>
              <p className={cn("text-2xl font-bold mt-0.5", totalDelta < 0 ? "text-red-600" : "text-emerald-600")}>
                {totalDelta >= 0 ? "+" : ""}{formatCurrency(totalDelta)}
              </p>
              <p className={cn("text-sm font-medium", totalDelta < 0 ? "text-red-600" : "text-emerald-600")}>
                {totalDeltaPct >= 0 ? "+" : ""}{totalDeltaPct.toFixed(1)}% dari total
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-asset table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b bg-muted">
                  <th className="text-left px-4 py-3 font-medium text-foreground">Aset</th>
                  <th className="text-right px-4 py-3 font-medium text-foreground">Nilai Kini</th>
                  <th className="text-right px-4 py-3 font-medium text-foreground">Turun</th>
                  <th className="text-right px-4 py-3 font-medium text-foreground">Nilai Setelah</th>
                  <th className="text-right px-4 py-3 font-medium text-foreground">Dampak (IDR)</th>
                </tr>
              </thead>
              <tbody>
                {results
                  .slice()
                  .sort((a, b) => a.deltaIDR - b.deltaIDR)
                  .map((r) => {
                    const dropPct = drops[r.exchange as keyof typeof drops];
                    return (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{r.stockCode}</span>
                            <Badge
                              variant="outline"
                              className={cn("text-xs px-1.5 py-0", EXCHANGE_BADGE[r.exchange])}
                            >
                              {r.exchange}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(r.valIDR)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-red-600">
                          {dropPct}%
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(r.newValIDR)}</td>
                        <td className={cn("px-4 py-3 text-right tabular-nums font-medium", r.deltaIDR < 0 ? "text-red-600" : "text-emerald-600")}>
                          {r.deltaIDR >= 0 ? "+" : ""}{formatCurrency(r.deltaIDR)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted">
                  <td className="px-4 py-3 font-semibold" colSpan={3}>Total</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {formatCurrency(totalAfter)}
                  </td>
                  <td className={cn("px-4 py-3 text-right font-bold tabular-nums", totalDelta < 0 ? "text-red-600" : "text-emerald-600")}>
                    {totalDelta >= 0 ? "+" : ""}{formatCurrency(totalDelta)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
