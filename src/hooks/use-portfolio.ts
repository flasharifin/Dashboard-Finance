import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { PortfolioWithCalc } from "@/types";

async function fetchPortfolios(): Promise<PortfolioWithCalc[]> {
  const [portfolioRes, marketRes] = await Promise.all([
    fetch("/api/portfolio").then((r) => r.json()),
    fetch("/api/portfolio")
      .then((r) => r.json())
      .then((data) => {
        const codes = data.data?.map((p: { stockCode: string }) => p.stockCode).join(",");
        if (!codes) return { data: {} };
        return fetch(`/api/market?symbols=${codes}`).then((r) => r.json());
      }),
  ]);

  const portfolios = portfolioRes.data ?? [];
  const prices = marketRes.data ?? {};

  return portfolios.map((p: { id: string; stockCode: string; lot: number; avgPrice: number | string; sector: string | null; note: string | null }) => {
    const avgPrice = Number(p.avgPrice);
    const marketData = prices[p.stockCode];
    const marketPrice = marketData?.price ?? null;
    const shares = p.lot * 100;
    const totalCost = shares * avgPrice;
    const marketValue = marketPrice !== null ? shares * marketPrice : null;
    const unrealizedPnl = marketValue !== null ? marketValue - totalCost : null;
    const unrealizedPnlPct = unrealizedPnl !== null && totalCost > 0 ? (unrealizedPnl / totalCost) * 100 : null;

    return {
      ...p,
      avgPrice,
      shares,
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

export function useAddPortfolio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["portfolio"] }),
  });
}

export function useUpdatePortfolio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      fetch(`/api/portfolio/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
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
