"use client";

import { useState } from "react";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, calcAvgPrice, getUnitLabel, cn } from "@/lib/utils";
import { Calculator } from "lucide-react";
import type { PortfolioWithCalc } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EXCHANGE_BADGE: Record<string, string> = {
  IDX: "bg-blue-100 text-blue-700",
  US: "bg-violet-100 text-violet-700",
  CRYPTO: "bg-amber-100 text-amber-700",
};

export default function DcaPage() {
  const { data: portfolios = [] } = usePortfolio();
  const { data: rateData } = useExchangeRate();
  const usdToIdr = rateData?.USDIDR ?? 16000;

  const [selectedId, setSelectedId] = useState("");
  const [newLot, setNewLot] = useState("");
  const [newPrice, setNewPrice] = useState("");

  const selected = portfolios.find((p: PortfolioWithCalc) => p.id === selectedId);
  const unitLabel = selected ? getUnitLabel(selected.exchange) : "lot";

  const simResult =
    selected && newLot && newPrice
      ? {
          newAvgPrice: calcAvgPrice(
            selected.lot,
            selected.avgPrice,
            Number(newLot),
            Number(newPrice)
          ),
          totalQty: selected.lot + Number(newLot),
          additionalCost: Number(newLot) * Number(newPrice),
          totalCost: selected.totalCost + Number(newLot) * Number(newPrice),
        }
      : null;

  const candidates = portfolios
    .filter((p: PortfolioWithCalc) => p.unrealizedPnlPct !== null && p.unrealizedPnlPct < 0)
    .sort(
      (a: PortfolioWithCalc, b: PortfolioWithCalc) =>
        (a.unrealizedPnlPct ?? 0) - (b.unrealizedPnlPct ?? 0)
    )
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">DCA Planner</h1>
        <p className="text-muted-foreground">
          Simulasi Dollar Cost Averaging — IDX, US Stocks & Crypto
        </p>
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
              <Label>Pilih Aset</Label>
              <Select value={selectedId} onValueChange={(v) => setSelectedId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih aset dari portfolio..." />
                </SelectTrigger>
                <SelectContent>
                  {portfolios.map((p: PortfolioWithCalc) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded px-1 text-xs font-medium",
                            EXCHANGE_BADGE[p.exchange]
                          )}
                        >
                          {p.exchange}
                        </span>
                        {p.stockCode} — {formatCurrency(p.avgPrice, p.currency)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selected && (
              <div className="rounded-md bg-muted/40 p-3 text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Exchange</span>
                  <Badge
                    variant="outline"
                    className={cn("text-xs", EXCHANGE_BADGE[selected.exchange])}
                  >
                    {selected.exchange}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Posisi saat ini</span>
                  <span className="font-medium">
                    {selected.lot} {unitLabel}
                    {selected.exchange === "IDX" && (
                      <span className="text-muted-foreground ml-1">
                        ({selected.units} lembar)
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg price</span>
                  <span className="font-medium">
                    {formatCurrency(selected.avgPrice, selected.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total modal</span>
                  <span className="font-medium">
                    {formatCurrency(selected.totalCost, selected.currency)}
                    {selected.currency === "USD" && (
                      <span className="text-muted-foreground ml-1 text-xs">
                        ≈ {formatCurrency(selected.totalCost * usdToIdr, "IDR")}
                      </span>
                    )}
                  </span>
                </div>
                {selected.marketPrice && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Harga pasar</span>
                    <span className="font-medium">
                      {formatCurrency(selected.marketPrice, selected.currency)}
                    </span>
                  </div>
                )}
              </div>
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  {selected?.exchange === "IDX"
                    ? "Lot baru"
                    : selected?.exchange === "US"
                    ? "Shares baru"
                    : "Unit baru"}
                </Label>
                <Input
                  type="number"
                  step={selected?.exchange === "CRYPTO" ? "0.00000001" : "1"}
                  min="0"
                  value={newLot}
                  onChange={(e) => setNewLot(e.target.value)}
                  placeholder={selected?.exchange === "CRYPTO" ? "0.5" : "10"}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Harga beli ({selected?.currency ?? "IDR"}/
                  {selected ? (selected.exchange === "IDX" ? "lembar" : unitLabel) : "unit"})
                </Label>
                <Input
                  type="number"
                  step="0.00000001"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder={selected?.currency === "USD" ? "150.00" : "8000"}
                />
              </div>
            </div>

            {simResult && selected && (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-4 space-y-2.5">
                <p className="font-semibold text-sm">Hasil Simulasi</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg price baru</span>
                    <span className="font-bold text-primary text-base">
                      {formatCurrency(simResult.newAvgPrice, selected.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total qty setelah DCA</span>
                    <span className="font-semibold">
                      {simResult.totalQty} {unitLabel}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Biaya tambahan</span>
                    <span className="font-semibold">
                      {formatCurrency(simResult.additionalCost, selected.currency)}
                      {selected.currency === "USD" && (
                        <span className="text-muted-foreground ml-1 text-xs">
                          ≈ {formatCurrency(simResult.additionalCost * usdToIdr, "IDR")}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total investasi</span>
                    <span className="font-semibold">
                      {formatCurrency(simResult.totalCost, selected.currency)}
                    </span>
                  </div>
                  {selected.marketPrice && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gap ke harga pasar</span>
                      <span
                        className={
                          simResult.newAvgPrice > selected.marketPrice
                            ? "font-semibold text-red-600"
                            : "font-semibold text-emerald-600"
                        }
                      >
                        {formatCurrency(
                          Math.abs(simResult.newAvgPrice - selected.marketPrice),
                          selected.currency
                        )}{" "}
                        (
                        {simResult.newAvgPrice > selected.marketPrice
                          ? "masih rugi"
                          : "sudah profit"}
                        )
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!selected && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Pilih aset dari portfolio untuk memulai simulasi.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kandidat DCA (Posisi Merah)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {candidates.map((p: PortfolioWithCalc) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn("text-xs px-1.5", EXCHANGE_BADGE[p.exchange])}
                      >
                        {p.exchange}
                      </Badge>
                      <span className="font-medium">{p.stockCode}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-red-600">
                        {p.unrealizedPnlPct?.toFixed(2)}%
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
                {candidates.length === 0 && (
                  <p className="text-muted-foreground text-sm py-2">
                    Semua posisi sedang profit.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Info Exchange</CardTitle>
            </CardHeader>
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
              <p>
                <b className="text-foreground">Kurs saat ini:</b>{" "}
                1 USD = {formatCurrency(usdToIdr, "IDR")}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
