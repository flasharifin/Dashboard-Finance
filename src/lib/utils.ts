import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  value: number | string | null | undefined,
  currency: "IDR" | "USD" = "IDR"
): string {
  if (value === null || value === undefined) return currency === "IDR" ? "Rp 0" : "$0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (currency === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatNumber(value: number | string | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return "0";
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatPercent(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined) return "0%";
  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}

export function calcAvgPrice(
  currentLot: number,
  currentAvgPrice: number,
  newLot: number,
  newPrice: number
): number {
  const totalUnits = currentLot + newLot;
  if (totalUnits === 0) return 0;
  const totalCost = currentLot * currentAvgPrice + newLot * newPrice;
  return totalCost / totalUnits;
}

export function calcDividendYield(dps: number, avgPrice: number): number {
  if (avgPrice === 0) return 0;
  return (dps / avgPrice) * 100;
}

export function calcNetDps(dps: number, taxPct: number): number {
  return dps * (1 - taxPct / 100);
}

export function calcReceivedAmount(lot: number, dps: number, taxPct: number): number {
  return lot * 100 * calcNetDps(dps, taxPct);
}

/** Hitung units berdasarkan exchange (IDX: lot×100, US/CRYPTO: lot×1) */
export function calcUnits(lot: number, exchange: string): number {
  return exchange === "IDX" ? lot * 100 : lot;
}

export function getExchangeLabel(exchange: string): string {
  const labels: Record<string, string> = {
    IDX: "IDX",
    US: "US",
    CRYPTO: "Crypto",
  };
  return labels[exchange] ?? exchange;
}

export function getUnitLabel(exchange: string): string {
  if (exchange === "CRYPTO") return "unit";
  if (exchange === "US") return "shares";
  return "lot";
}

export function exportToCSV(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
