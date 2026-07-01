import { useQuery } from "@tanstack/react-query";

export type HistoryPoint = { date: string; close: number };
export type HistoryData = Record<string, HistoryPoint[] | null>;

export function useMarketHistory(assets: string[]) {
  const assetsParam = assets.join(",");
  return useQuery<HistoryData>({
    queryKey: ["market-history", assetsParam],
    queryFn: async () => {
      if (!assetsParam) return {};
      const res = await fetch(
        `/api/market/history?assets=${encodeURIComponent(assetsParam)}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal memuat data histori");
      return json.data as HistoryData;
    },
    enabled: assets.length > 0,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
}
