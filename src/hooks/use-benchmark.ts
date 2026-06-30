import { useQuery } from "@tanstack/react-query";

type BenchmarkData = {
  IHSG: { price: number; change: number; changePercent: number } | null;
  SP500: { price: number; change: number; changePercent: number } | null;
};

export function useBenchmark() {
  return useQuery<BenchmarkData>({
    queryKey: ["benchmark"],
    queryFn: () => fetch("/api/market/benchmark").then((r) => r.json()).then((r) => r.data),
    refetchInterval: 15 * 60 * 1000,
  });
}
