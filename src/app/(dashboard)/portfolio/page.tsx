"use client";

import { useState } from "react";
import {
  usePortfolio,
  useAddPortfolio,
  useUpdatePortfolio,
  useDeletePortfolio,
} from "@/hooks/use-portfolio";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { PortfolioSummaryCards } from "@/components/features/portfolio/summary-cards";
import { PortfolioTable } from "@/components/features/portfolio/portfolio-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus } from "lucide-react";
import type { PortfolioWithCalc, Exchange, Currency } from "@/types";
import { calcAvgPrice, formatCurrency, getUnitLabel } from "@/lib/utils";

const EXCHANGE_OPTIONS: { value: Exchange; label: string; currency: Currency; hint: string }[] = [
  { value: "IDX", label: "IDX (Bursa Indonesia)", currency: "IDR", hint: "Contoh: BBCA, TLKM, GOTO" },
  { value: "US",  label: "US Stock (NYSE/NASDAQ)", currency: "USD", hint: "Contoh: AAPL, GOOGL, TSLA" },
  { value: "CRYPTO", label: "Crypto", currency: "USD", hint: "Contoh: BTC, ETH, SOL" },
];

export default function PortfolioPage() {
  const { data: portfolios = [], isLoading } = usePortfolio();
  const { data: rateData } = useExchangeRate();
  const usdToIdr = rateData?.USDIDR ?? 16000;

  const addMutation = useAddPortfolio();
  const updateMutation = useUpdatePortfolio();
  const deleteMutation = useDeletePortfolio();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PortfolioWithCalc | null>(null);
  const [exchange, setExchange] = useState<Exchange>("IDX");
  const [simNewLot, setSimNewLot] = useState("");
  const [simNewPrice, setSimNewPrice] = useState("");

  const selectedExchangeOpt = EXCHANGE_OPTIONS.find((e) => e.value === exchange)!;
  const unitLabel = getUnitLabel(exchange);

  function openAdd() {
    setEditing(null);
    setExchange("IDX");
    setSimNewLot("");
    setSimNewPrice("");
    setDialogOpen(true);
  }

  function openEdit(p: PortfolioWithCalc) {
    setEditing(p);
    setExchange(p.exchange);
    setSimNewLot("");
    setSimNewPrice("");
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      // stockCode di-disabled saat edit → ambil dari state, bukan form
      stockCode: editing ? editing.stockCode : (form.get("stockCode") as string),
      lot: Number(form.get("lot")),
      avgPrice: Number(form.get("avgPrice")),
      exchange,
      currency: selectedExchangeOpt.currency,
      sector: (form.get("sector") as string) || undefined,
      note: (form.get("note") as string) || undefined,
    };

    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, ...payload });
    } else {
      await addMutation.mutateAsync(payload);
    }
    setDialogOpen(false);
  }

  async function handleDelete(id: string) {
    if (confirm("Hapus posisi ini?")) {
      await deleteMutation.mutateAsync(id);
    }
  }

  const simResult =
    editing && simNewLot && simNewPrice
      ? calcAvgPrice(editing.lot, editing.avgPrice, Number(simNewLot), Number(simNewPrice))
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Portfolio</h1>
          <p className="text-muted-foreground">Saham IDX, US Stocks & Crypto</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Aset
        </Button>
      </div>

      <PortfolioSummaryCards portfolios={portfolios} usdToIdr={usdToIdr} />

      <PortfolioTable
        portfolios={portfolios}
        isLoading={isLoading}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit ${editing.stockCode}` : "Tambah Aset"}
            </DialogTitle>
          </DialogHeader>

          <form key={editing?.id ?? "new"} onSubmit={handleSubmit} className="space-y-4">
            {/* Exchange selector */}
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
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{selectedExchangeOpt.hint}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  {exchange === "IDX" ? "Kode Saham" : exchange === "US" ? "Ticker" : "Symbol"}
                </Label>
                <Input
                  name="stockCode"
                  defaultValue={editing?.stockCode}
                  placeholder={
                    exchange === "IDX" ? "BBCA" : exchange === "US" ? "AAPL" : "BTC"
                  }
                  required
                  disabled={!!editing}
                  className="uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label>Sektor / Kategori</Label>
                <Input
                  name="sector"
                  defaultValue={editing?.sector ?? ""}
                  placeholder={
                    exchange === "CRYPTO" ? "Layer 1" : exchange === "US" ? "Tech" : "Perbankan"
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  {exchange === "IDX"
                    ? "Jumlah Lot"
                    : exchange === "US"
                    ? "Jumlah Shares"
                    : "Jumlah Unit"}
                </Label>
                <Input
                  name="lot"
                  type="number"
                  min="0.00000001"
                  step={exchange === "IDX" ? "1" : "0.00000001"}
                  defaultValue={editing?.lot}
                  required
                />
                {exchange === "IDX" && (
                  <p className="text-xs text-muted-foreground">1 lot = 100 lembar</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>
                  Avg Price ({selectedExchangeOpt.currency}/
                  {exchange === "IDX" ? "lembar" : unitLabel})
                </Label>
                <Input
                  name="avgPrice"
                  type="number"
                  min="0.00000001"
                  step="0.00000001"
                  defaultValue={editing?.avgPrice}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Catatan</Label>
              <Input name="note" defaultValue={editing?.note ?? ""} placeholder="Opsional" />
            </div>

            {/* DCA simulator — hanya untuk edit */}
            {editing && (
              <div className="rounded-md border bg-muted/40 p-3 space-y-3">
                <p className="text-sm font-medium">Simulasi DCA</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">
                      {exchange === "IDX" ? "Lot baru" : "Qty baru"}
                    </Label>
                    <Input
                      type="number"
                      step={exchange === "IDX" ? "1" : "0.00000001"}
                      value={simNewLot}
                      onChange={(e) => setSimNewLot(e.target.value)}
                      placeholder={exchange === "IDX" ? "10" : "5"}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Harga ({editing.currency})
                    </Label>
                    <Input
                      type="number"
                      step="0.00000001"
                      value={simNewPrice}
                      onChange={(e) => setSimNewPrice(e.target.value)}
                      placeholder={editing.currency === "USD" ? "150.00" : "8000"}
                    />
                  </div>
                </div>
                {simResult && (
                  <p className="text-sm">
                    Avg baru:{" "}
                    <span className="font-semibold text-primary">
                      {formatCurrency(simResult, editing.currency)}
                    </span>
                    {" "}· Total qty:{" "}
                    <span className="font-semibold">
                      {editing.lot + Number(simNewLot)} {unitLabel}
                    </span>
                  </p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={addMutation.isPending || updateMutation.isPending}
              >
                {editing ? "Simpan" : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
