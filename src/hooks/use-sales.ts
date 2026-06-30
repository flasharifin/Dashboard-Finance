import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

async function apiFetch(url: string, options: RequestInit) {
  const res = await fetch(url, options);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Terjadi kesalahan");
  return json;
}

export function useSaleTransactions() {
  return useQuery({
    queryKey: ["sales"],
    queryFn: () => fetch("/api/portfolio/sales").then((r) => r.json()).then((r) => r.data ?? []),
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
      fetch(`/api/portfolio/sales/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Histori jual dihapus");
    },
  });
}
