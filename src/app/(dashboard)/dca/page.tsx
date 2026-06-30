"use client";

import { useState } from "react";
import { usePortfolio } from "@/hooks/use-portfolio";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, calcAvgPrice } from "@/lib/utils";
import { Calculator } from "lucide-react";
import type { PortfolioWithCalc } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DcaPage() {
  const { data: portfolios = [] } = usePortfolio();

  const [selectedId, setSelectedId] = useState("");
  const [newLot, setNewLot] = useState("");
  const [newPrice, setNewPrice] = useState("");

  const selected = portfolios.find((p: PortfolioWithCalc) => p.id === selectedId);

  const simResult =
    selected && newLot && newPrice
      ? {
          newAvgPrice: calcAvgPrice(selected.lot, selected.avgPrice, Number(newLot), Number(newPrice)),
          totalLot: selected.lot + Number(newLot),
          additionalCost: Number(newLot) * 100 * Number(newPrice),
          totalCost: selected.totalCost + Number(newLot) * 100 * Number(newPrice),
        }
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">DCA Planner</h1>
        <p className="text-muted-foreground">Simulasi Dollar Cost Averaging untuk portofolio Anda</p>
      </div>

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
              <Label>Pilih Saham</Label>
              <Select value={selectedId} onValueChange={(v) => setSelectedId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih emiten..." />
                </SelectTrigger>
                <SelectContent>
                  {portfolios.map((p: PortfolioWithCalc) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.stockCode} — {p.lot} lot @ {formatCurrency(p.avgPrice)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selected && (
              <div className="rounded-md bg-muted/40 p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Posisi saat ini</span>
                  <span className="font-medium">{selected.lot} lot ({selected.lot * 100} lembar)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg price</span>
                  <span className="font-medium">{formatCurrency(selected.avgPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total modal</span>
                  <span className="font-medium">{formatCurrency(selected.totalCost)}</span>
                </div>
                {selected.marketPrice && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Harga pasar</span>
                    <span className="font-medium">{formatCurrency(selected.marketPrice)}</span>
                  </div>
                )}
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lot yang akan dibeli</Label>
                <Input
                  type="number"
                  min={1}
                  value={newLot}
                  onChange={(e) => setNewLot(e.target.value)}
                  placeholder="10"
                />
              </div>
              <div className="space-y-2">
                <Label>Harga beli (Rp/lembar)</Label>
                <Input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="8000"
                />
              </div>
            </div>

            {simResult && (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-4 space-y-3">
                <p className="font-semibold text-sm">Hasil Simulasi</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg price baru</span>
                    <span className="font-bold text-primary text-base">
                      {formatCurrency(simResult.newAvgPrice)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total lot setelah DCA</span>
                    <span className="font-semibold">{simResult.totalLot} lot</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Biaya tambahan</span>
                    <span className="font-semibold">{formatCurrency(simResult.additionalCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total investasi</span>
                    <span className="font-semibold">{formatCurrency(simResult.totalCost)}</span>
                  </div>
                  {selected?.marketPrice && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gap ke harga pasar</span>
                      <span className={simResult.newAvgPrice > selected.marketPrice ? "font-semibold text-red-600" : "font-semibold text-emerald-600"}>
                        {formatCurrency(Math.abs(simResult.newAvgPrice - selected.marketPrice))}
                        {" "}({simResult.newAvgPrice > selected.marketPrice ? "masih rugi" : "sudah profit"})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!selected && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Pilih saham dari portofolio untuk memulai simulasi DCA.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Panduan DCA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                <b className="text-foreground">Dollar Cost Averaging (DCA)</b> adalah strategi membeli
                saham secara berkala dengan jumlah tetap, terlepas dari harga pasar saat itu.
              </p>
              <ul className="list-disc list-inside space-y-1.5">
                <li>Kurangi risiko beli di harga puncak</li>
                <li>Menurunkan rata-rata harga beli saat market turun</li>
                <li>Cocok untuk investasi jangka panjang</li>
                <li>Disiplin lebih penting daripada timing pasar</li>
              </ul>
              <Separator />
              <p>
                <b className="text-foreground">Formula avg price baru:</b>
              </p>
              <code className="block rounded bg-muted p-2 text-xs">
                avg_baru = (total_saham_lama × harga_lama + saham_baru × harga_baru)
                          / total_saham
              </code>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Posisi Kandidat DCA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {portfolios
                  .filter((p: PortfolioWithCalc) => p.unrealizedPnlPct !== null && p.unrealizedPnlPct < 0)
                  .sort((a: PortfolioWithCalc, b: PortfolioWithCalc) => (a.unrealizedPnlPct ?? 0) - (b.unrealizedPnlPct ?? 0))
                  .slice(0, 5)
                  .map((p: PortfolioWithCalc) => (
                    <div key={p.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                      <span className="font-medium">{p.stockCode}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-red-600">
                          {p.unrealizedPnlPct !== null ? p.unrealizedPnlPct.toFixed(2) : "—"}%
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-xs"
                          onClick={() => setSelectedId(p.id)}
                        >
                          Simulasi
                        </Button>
                      </div>
                    </div>
                  ))}
                {portfolios.filter((p: PortfolioWithCalc) => (p.unrealizedPnlPct ?? 0) < 0).length === 0 && (
                  <p className="text-muted-foreground text-sm">Semua posisi sedang profit.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
