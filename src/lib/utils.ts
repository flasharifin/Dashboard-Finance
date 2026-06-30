import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "Rp 0";
  const num = typeof value === "string" ? parseFloat(value) : value;
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
  const totalShares = (currentLot + newLot) * 100;
  const totalCost = currentLot * 100 * currentAvgPrice + newLot * 100 * newPrice;
  return totalCost / totalShares;
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
