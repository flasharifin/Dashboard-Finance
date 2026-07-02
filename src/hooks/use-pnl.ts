import { useQuery } from "@tanstack/react-query";

export type DailyPnlRecord = {
  id: string;
  date: string;
  portfolioValue: number;
  pnl: number;
  pnlPct: number;
};

export type MonthlyPnlRecord = {
  id: string;
  month: string;
  openValue: number;
  closeValue: number;
  totalPnl: number;
  pnlPct: number;
};

export function useDailyPnl() {
  return useQuery<DailyPnlRecord[]>({
    queryKey: ["pnl-daily"],
    queryFn: () => fetch("/api/pnl/daily").then((r) => r.json()).then((r) => r.data ?? []),
    staleTime: 5 * 60 * 1000,
  });
}

export function useMonthlyPnl() {
  return useQuery<MonthlyPnlRecord[]>({
    queryKey: ["pnl-monthly"],
    queryFn: () => fetch("/api/pnl/monthly").then((r) => r.json()).then((r) => r.data ?? []),
    staleTime: 5 * 60 * 1000,
  });
}
