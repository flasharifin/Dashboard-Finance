import { useQuery } from "@tanstack/react-query";
import type { ExchangeRate } from "@/types";

export function useExchangeRate() {
  return useQuery<ExchangeRate>({
    queryKey: ["exchange-rate"],
    queryFn: () =>
      fetch("/api/market/rate").then((r) => r.json()).then((r) => r.data),
    staleTime: 60 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
  });
}
