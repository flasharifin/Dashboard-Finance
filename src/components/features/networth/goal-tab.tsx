"use client";

import { useState, useMemo } from "react";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, cn } from "@/lib/utils";
import { Target, Pencil, Check, X, TrendingUp, CalendarDays, CircleDollarSign, Percent } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Legend,
} from "recharts";
import { format, differenceInMonths, addMonths } from "date-fns";
import { id as idLocale } from "date-fns/locale";

// ── Financial helpers ─────────────────────────────────────────────────────────

function toMonthlyRate(annualPct: number) {
  return Math.pow(1 + annualPct / 100, 1 / 12) - 1;
}

function requiredPMT(pv: number, fv: number, r: number, n: number): number {
  if (n <= 0 || fv <= pv) return 0;
  const growth = Math.pow(1 + r, n);
  if (r < 1e-10) return (fv - pv) / n;
  return (fv - pv * growth) * r / (growth - 1);
}

function monthsToTarget(pv: number, fv: number, r: number, pmt: number): number | null {
  if (pv >= fv) return 0;
  if (pmt <= 0 && r < 1e-10) return null;
  // Simulasi bulan per bulan — akurat untuk semua kombinasi nilai, max 100 tahun
  let v = pv;
  for (let m = 1; m <= 1200; m++) {
    v = v * (1 + r) + pmt;
    if (v >= fv) return m;
  }
  return null;
}

function buildProjection(
  pv: number,
  pmt: number,
  r: number,
  months: number,
): { label: string; withContrib: number; noContrib: number }[] {
  const startYear = new Date().getFullYear();
  const totalMonths = Math.max(months + 12, 24);
  const points: { label: string; withContrib: number; noContrib: number }[] = [];
  let vWith = pv;
  let vNo   = pv;

  for (let m = 0; m <= totalMonths; m++) {
    if (m % 12 === 0) {
      points.push({
        label:      String(startYear + Math.floor(m / 12)),
        withContrib: Math.round(vWith),
        noContrib:  Math.round(vNo),
      });
    }
    vWith = vWith * (1 + r) + pmt;
    vNo   = vNo   * (1 + r);
  }
  return points;
}

function fmtDuration(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} bln`;
  if (m === 0) return `${y} thn`;
  return `${y} thn ${m} bln`;
}

// ── Component ─────────────────────────────────────────────────────────────────

type Props = { currentNetWorth: number };

export function GoalTab({ currentNetWorth }: Props) {
  const { data: settings, isLoading } = useSettings();
  const update = useUpdateSettings();
  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState({
    goalName:           "",
    wealthTarget:       "",
    goalDeadline:       "",
    goalReturnPct:      "",
    goalMonthlyContrib: "",
  });

  function openEdit() {
    setForm({
      goalName:           settings?.goalName           ?? "",
      wealthTarget:       String(settings?.wealthTarget ?? 100_000_000),
      goalDeadline:       settings?.goalDeadline
        ? settings.goalDeadline.split("T")[0]
        : "",
      goalReturnPct:      String(settings?.goalReturnPct      ?? 12),
      goalMonthlyContrib: settings?.goalMonthlyContrib != null
        ? String(settings.goalMonthlyContrib)
        : "",
    });
    setEditing(true);
  }

  function save() {
    const target = Number(form.wealthTarget);
    if (!target || target <= 0) return;
    update.mutate({
      goalName:           form.goalName || null,
      wealthTarget:       target,
      goalDeadline:       form.goalDeadline || null,
      goalReturnPct:      form.goalReturnPct ? Number(form.goalReturnPct) : 12,
      goalMonthlyContrib: form.goalMonthlyContrib ? Number(form.goalMonthlyContrib) : null,
    }, { onSuccess: () => setEditing(false) });
  }

  // ── Derived calculations ─────────────────────────────────────────────────

  const calc = useMemo(() => {
    if (!settings) return null;

    const target     = settings.wealthTarget;
    const returnPct  = settings.goalReturnPct ?? 12;
    const pmt        = settings.goalMonthlyContrib ?? 0;
    const r          = toMonthlyRate(returnPct);
    const now        = new Date();

    const deadline   = settings.goalDeadline ? new Date(settings.goalDeadline) : null;
    const monthsLeft = deadline ? differenceInMonths(deadline, now) : null;

    const progress   = target > 0 ? Math.min((currentNetWorth / target) * 100, 100) : 0;
    const remaining  = Math.max(target - currentNetWorth, 0);

    const neededPMT  = monthsLeft && monthsLeft > 0
      ? requiredPMT(currentNetWorth, target, r, monthsLeft)
      : null;

    const monthsNeeded = monthsToTarget(currentNetWorth, target, r, pmt);
    const estReachDate = monthsNeeded != null
      ? addMonths(now, monthsNeeded)
      : null;

    const projMonths = monthsLeft ?? (monthsNeeded ?? 120);
    const projection = buildProjection(currentNetWorth, pmt, r, projMonths);

    return {
      target, returnPct, pmt, r,
      deadline, monthsLeft, progress, remaining,
      neededPMT, monthsNeeded, estReachDate, projection,
    };
  }, [settings, currentNetWorth]);

  if (isLoading) {
    return (
      <div className="space-y-4 pt-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  const goalName = settings?.goalName || "Tujuan Keuangan";

  return (
    <div className="space-y-5 pt-2">

      {/* ── Header & edit button ─────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary shrink-0" />
          <div>
            <h3 className="font-semibold text-base leading-tight">{goalName}</h3>
            {calc?.deadline && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Target: {format(calc.deadline, "d MMMM yyyy", { locale: idLocale })}
                {calc.monthsLeft != null && calc.monthsLeft > 0 && (
                  <span className="ml-1">({fmtDuration(calc.monthsLeft)} lagi)</span>
                )}
              </p>
            )}
          </div>
        </div>
        {!editing && (
          <Button size="sm" variant="outline" onClick={openEdit} className="shrink-0">
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Ubah Goal
          </Button>
        )}
      </div>

      {/* ── Edit form ────────────────────────────────────────── */}
      {editing && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4 pb-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-xs">Nama Goal</Label>
                <Input
                  className="mt-1 h-9"
                  placeholder="Kebebasan Finansial"
                  value={form.goalName}
                  onChange={(e) => setForm({ ...form, goalName: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Target (Rp)</Label>
                <Input
                  type="number"
                  className="mt-1 h-9"
                  placeholder="1000000000"
                  value={form.wealthTarget}
                  onChange={(e) => setForm({ ...form, wealthTarget: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Deadline</Label>
                <Input
                  type="date"
                  className="mt-1 h-9"
                  value={form.goalDeadline}
                  onChange={(e) => setForm({ ...form, goalDeadline: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Return Tahunan (%)</Label>
                <Input
                  type="number"
                  className="mt-1 h-9"
                  placeholder="12"
                  value={form.goalReturnPct}
                  onChange={(e) => setForm({ ...form, goalReturnPct: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Kontribusi/bulan (Rp)</Label>
                <Input
                  type="number"
                  className="mt-1 h-9"
                  placeholder="5000000"
                  value={form.goalMonthlyContrib}
                  onChange={(e) => setForm({ ...form, goalMonthlyContrib: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                <X className="h-3.5 w-3.5 mr-1" />Batal
              </Button>
              <Button size="sm" onClick={save} disabled={update.isPending}>
                <Check className="h-3.5 w-3.5 mr-1" />Simpan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Progress ─────────────────────────────────────────── */}
      {calc && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-3 pb-3">
                <p className="text-xs text-muted-foreground">Net Worth Kini</p>
                <p className="text-base font-bold mt-0.5 truncate">{formatCurrency(currentNetWorth)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-3">
                <p className="text-xs text-muted-foreground">Target</p>
                <p className="text-base font-bold mt-0.5 truncate">{formatCurrency(calc.target)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-3">
                <p className="text-xs text-muted-foreground">Sisa</p>
                <p className="text-base font-bold mt-0.5 truncate text-amber-600">{formatCurrency(calc.remaining)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-3">
                <p className="text-xs text-muted-foreground">Progress</p>
                <p className={cn("text-base font-bold mt-0.5", calc.progress >= 100 ? "text-emerald-600" : "text-primary")}>
                  {calc.progress.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700",
                  calc.progress >= 100 ? "bg-emerald-500"
                  : calc.progress >= 75 ? "bg-blue-500"
                  : calc.progress >= 50 ? "bg-violet-500"
                  : calc.progress >= 25 ? "bg-amber-500"
                  : "bg-rose-400"
                )}
                style={{ width: `${calc.progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right">
              {formatCurrency(currentNetWorth)} dari {formatCurrency(calc.target)}
            </p>
          </div>

          {/* ── Kalkulasi ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Diperlukan per bulan */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <CircleDollarSign className="h-3.5 w-3.5 text-blue-600" />
                  <p className="text-xs font-semibold text-blue-700">Diperlukan/bulan</p>
                </div>
                {calc.neededPMT != null ? (
                  <>
                    <p className="text-lg font-bold text-blue-800">
                      {formatCurrency(Math.max(calc.neededPMT, 0))}
                    </p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      untuk capai target tepat waktu
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-blue-600 mt-1">Set deadline dulu</p>
                )}
              </CardContent>
            </Card>

            {/* Rencana saya */}
            <Card className={cn(
              "border-2",
              calc.pmt > 0 && calc.neededPMT != null
                ? calc.pmt >= calc.neededPMT ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"
                : "border-muted"
            )}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className={cn("h-3.5 w-3.5",
                    calc.pmt > 0 && calc.neededPMT != null
                      ? calc.pmt >= calc.neededPMT ? "text-emerald-600" : "text-amber-600"
                      : "text-muted-foreground"
                  )} />
                  <p className={cn("text-xs font-semibold",
                    calc.pmt > 0 && calc.neededPMT != null
                      ? calc.pmt >= calc.neededPMT ? "text-emerald-700" : "text-amber-700"
                      : "text-muted-foreground"
                  )}>Rencana Saya</p>
                </div>
                {calc.pmt > 0 ? (
                  <>
                    <p className={cn("text-lg font-bold",
                      calc.neededPMT != null
                        ? calc.pmt >= calc.neededPMT ? "text-emerald-800" : "text-amber-800"
                        : "text-foreground"
                    )}>
                      {formatCurrency(calc.pmt)}/bln
                    </p>
                    {calc.neededPMT != null && (
                      <p className={cn("text-xs mt-0.5",
                        calc.pmt >= calc.neededPMT ? "text-emerald-600" : "text-amber-600"
                      )}>
                        {calc.pmt >= calc.neededPMT
                          ? `+${formatCurrency(calc.pmt - calc.neededPMT)} dari kebutuhan`
                          : `-${formatCurrency(calc.neededPMT - calc.pmt)} dari kebutuhan`
                        }
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">Belum diset</p>
                )}
              </CardContent>
            </Card>

            {/* Estimasi tercapai */}
            <Card className="border-violet-200 bg-violet-50">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <CalendarDays className="h-3.5 w-3.5 text-violet-600" />
                  <p className="text-xs font-semibold text-violet-700">Perkiraan Tercapai</p>
                </div>
                {calc.estReachDate != null && calc.monthsNeeded != null ? (
                  <>
                    <p className="text-lg font-bold text-violet-800">
                      {format(calc.estReachDate, "MMM yyyy", { locale: idLocale })}
                    </p>
                    <p className="text-xs text-violet-600 mt-0.5">
                      {fmtDuration(calc.monthsNeeded)} dari sekarang
                    </p>
                  </>
                ) : calc.pmt <= 0 ? (
                  <p className="text-sm text-violet-600 mt-1">Set kontribusi/bulan dulu</p>
                ) : (
                  <p className="text-sm text-violet-600 mt-1">Kontribusi kurang, tidak akan tercapai</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Proyeksi chart ─────────────────────────────────── */}
          {calc.projection.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  Proyeksi Pertumbuhan
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    (asumsi return {calc.returnPct}%/thn)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={calc.projection} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) =>
                        v >= 1_000_000_000
                          ? `${(v / 1_000_000_000).toFixed(1)}M`
                          : v >= 1_000_000
                          ? `${(v / 1_000_000).toFixed(0)}jt`
                          : `${(v / 1000).toFixed(0)}rb`
                      }
                      width={48}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        formatCurrency(Number(value)),
                        name === "withContrib" ? "Dengan kontribusi" : "Tanpa kontribusi",
                      ]}
                      labelStyle={{ fontWeight: 600 }}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Legend
                      formatter={(v) =>
                        v === "withContrib" ? "Dengan kontribusi" : "Tanpa kontribusi"
                      }
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 11 }}
                    />
                    {/* Target reference line */}
                    <ReferenceLine
                      y={calc.target}
                      stroke="#f59e0b"
                      strokeDasharray="5 3"
                      label={{ value: "Target", position: "insideTopRight", fontSize: 10, fill: "#b45309" }}
                    />
                    <Line
                      dataKey="withContrib"
                      stroke="#8b5cf6"
                      strokeWidth={2.5}
                      dot={false}
                      name="withContrib"
                    />
                    {calc.pmt > 0 && (
                      <Line
                        dataKey="noContrib"
                        stroke="#94a3b8"
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
                        dot={false}
                        name="noContrib"
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground text-center mt-1">
                  Garis kuning putus-putus = target · Ungu = dengan kontribusi · Abu = tanpa kontribusi
                </p>
              </CardContent>
            </Card>
          )}

          {/* Asumsi note */}
          <p className="text-xs text-muted-foreground">
            * Proyeksi menggunakan compound interest bulanan. Return historis bukan jaminan return masa depan.
            Net Worth kini dihitung dari portfolio + aset manual − hutang.
          </p>
        </>
      )}

      {/* Empty state */}
      {!calc && !isLoading && (
        <Card>
          <CardContent className="py-14 text-center">
            <Target className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="font-medium text-muted-foreground">Belum ada goal yang diset</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Klik &quot;Ubah Goal&quot; untuk mulai merencanakan tujuan keuangan Anda.
            </p>
            <Button size="sm" onClick={openEdit}>
              <Target className="h-3.5 w-3.5 mr-1.5" />Set Goal Sekarang
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
