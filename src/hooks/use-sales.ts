import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";

export function useSaleTransactions() {
  return useQuery({
    queryKey: ["sales"],
    queryFn: () => fetch("/api/portfolio/sales").then((r) => r.json()).then((r) => r.data ?? []),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSellPortfolio() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch("/api/portfolio/sell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portfolio"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Posisi berhasil dijual — realized P&L tercatat");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteSale() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/portfolio/sales/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Histori jual dihapus");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
