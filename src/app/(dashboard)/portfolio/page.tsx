"use client";

import { useState } from "react";
import { usePortfolio, useAddPortfolio, useUpdatePortfolio, useDeletePortfolio } from "@/hooks/use-portfolio";
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
import { Plus } from "lucide-react";
import type { PortfolioWithCalc } from "@/types";
import { calcAvgPrice, formatCurrency } from "@/lib/utils";

export default function PortfolioPage() {
  const { data: portfolios = [], isLoading } = usePortfolio();
  const addMutation = useAddPortfolio();
  const updateMutation = useUpdatePortfolio();
  const deleteMutation = useDeletePortfolio();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PortfolioWithCalc | null>(null);

  // DCA simulator state
  const [simNewLot, setSimNewLot] = useState("");
  const [simNewPrice, setSimNewPrice] = useState("");

  const totalCost = portfolios.reduce((s, p) => s + p.totalCost, 0);
  const marketValue = portfolios.reduce((s, p) => s + (p.marketValue ?? p.totalCost), 0);
  const unrealizedPnl = portfolios.reduce((s, p) => s + (p.unrealizedPnl ?? 0), 0);
  const unrealizedPnlPct = totalCost > 0 ? (unrealizedPnl / totalCost) * 100 : 0;

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(p: PortfolioWithCalc) {
    setEditing(p);
    setSimNewLot("");
    setSimNewPrice("");
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      stockCode: form.get("stockCode") as string,
      lot: Number(form.get("lot")),
      avgPrice: Number(form.get("avgPrice")),
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
          <p className="text-muted-foreground">Kelola posisi saham Anda</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Saham
        </Button>
      </div>

      <PortfolioSummaryCards
        totalCost={totalCost}
        marketValue={marketValue}
        unrealizedPnl={unrealizedPnl}
        unrealizedPnlPct={unrealizedPnlPct}
        totalPositions={portfolios.length}
      />

      <PortfolioTable
        portfolios={portfolios}
        isLoading={isLoading}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.stockCode}` : "Tambah Saham"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kode Saham</Label>
                <Input
                  name="stockCode"
                  defaultValue={editing?.stockCode}
                  placeholder="BBCA"
                  required
                  disabled={!!editing}
                  className="uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label>Sektor</Label>
                <Input name="sector" defaultValue={editing?.sector ?? ""} placeholder="Perbankan" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jumlah Lot</Label>
                <Input
                  name="lot"
                  type="number"
                  min={1}
                  defaultValue={editing?.lot}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Avg Price (Rp/lembar)</Label>
                <Input
                  name="avgPrice"
                  type="number"
                  min={1}
                  step="0.01"
                  defaultValue={editing?.avgPrice}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Catatan</Label>
              <Input name="note" defaultValue={editing?.note ?? ""} placeholder="Opsional" />
            </div>

            {editing && (
              <div className="rounded-md border bg-muted/40 p-3 space-y-3">
                <p className="text-sm font-medium">Simulasi DCA</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Lot baru</Label>
                    <Input
                      type="number"
                      min={1}
                      value={simNewLot}
                      onChange={(e) => setSimNewLot(e.target.value)}
                      placeholder="10"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Harga beli (Rp)</Label>
                    <Input
                      type="number"
                      value={simNewPrice}
                      onChange={(e) => setSimNewPrice(e.target.value)}
                      placeholder="8000"
                    />
                  </div>
                </div>
                {simResult && (
                  <p className="text-sm">
                    Avg baru:{" "}
                    <span className="font-semibold text-primary">{formatCurrency(simResult)}</span>
                    {" "}· Total lot:{" "}
                    <span className="font-semibold">{editing.lot + Number(simNewLot)}</span>
                  </p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
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
