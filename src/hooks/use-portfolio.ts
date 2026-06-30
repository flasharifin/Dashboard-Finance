import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { PortfolioWithCalc, Exchange, Currency } from "@/types";
import { calcUnits } from "@/lib/utils";

type RawPortfolio = {
  id: string;
  stockCode: string;
  lot: number | string;
  avgPrice: number | string;
  exchange: Exchange;
  currency: Currency;
  platform: string;
  sector: string | null;
  note: string | null;
};

async function fetchPortfolios(): Promise<PortfolioWithCalc[]> {
  const portfolioRes = await fetch("/api/portfolio").then((r) => r.json());
  const portfolios: RawPortfolio[] = portfolioRes.data ?? [];

  if (portfolios.length === 0) return [];

  // Build assets param: BBCA:IDX,AAPL:US,BTC:CRYPTO
  const assetsParam = portfolios
    .map((p) => `${p.stockCode}:${p.exchange}`)
    .join(",");

  const marketRes = await fetch(`/api/market?assets=${assetsParam}`).then((r) => r.json());
  const prices: Record<string, { price: number; change: number; changePercent: number } | null> =
    marketRes.data ?? {};

  return portfolios.map((p) => {
    const lot = Number(p.lot);
    const avgPrice = Number(p.avgPrice);
    const units = calcUnits(lot, p.exchange);
    const totalCost = units * avgPrice;

    const marketData = prices[`${p.stockCode}:${p.exchange}`];
    const marketPrice = marketData?.price ?? null;
    const marketValue = marketPrice !== null ? units * marketPrice : null;
    const unrealizedPnl = marketValue !== null ? marketValue - totalCost : null;
    const unrealizedPnlPct =
      unrealizedPnl !== null && totalCost > 0 ? (unrealizedPnl / totalCost) * 100 : null;

    return {
      id: p.id,
      stockCode: p.stockCode,
      lot,
      avgPrice,
      exchange: p.exchange,
      currency: p.currency,
      platform: p.platform ?? "",
      sector: p.sector,
      note: p.note,
      units,
      totalCost,
      marketPrice,
      marketValue,
      unrealizedPnl,
      unrealizedPnlPct,
    };
  });
}

export function usePortfolio() {
  return useQuery({
    queryKey: ["portfolio"],
    queryFn: fetchPortfolios,
    refetchInterval: 15 * 60 * 1000,
  });
}

async function apiFetch(url: string, options: RequestInit) {
  const res = await fetch(url, options);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Terjadi kesalahan");
  return json;
}

export function useAddPortfolio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["portfolio"] }),
  });
}

export function useUpdatePortfolio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiFetch(`/api/portfolio/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["portfolio"] }),
  });
}

export function useDeletePortfolio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/portfolio/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["portfolio"] }),
  });
}
