import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";

// ── DCA Plans ─────────────────────────────────────────────────────

export function useDcaPlans() {
  return useQuery({
    queryKey: ["dca-plans"],
    queryFn: () => fetch("/api/dca/plans").then((r) => r.json()).then((r) => r.data ?? []),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAddDcaPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch("/api/dca/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dca-plans"] });
      toast.success("Rencana DCA berhasil ditambahkan");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateDcaPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiFetch(`/api/dca/plans/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dca-plans"] });
      toast.success("Rencana DCA berhasil diperbarui");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteDcaPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/dca/plans/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dca-plans"] });
      toast.success("Rencana DCA dihapus");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── DCA Transactions ──────────────────────────────────────────────

export function useDcaTransactions() {
  return useQuery({
    queryKey: ["dca-transactions"],
    queryFn: () => fetch("/api/dca/transactions").then((r) => r.json()).then((r) => r.data ?? []),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAddDcaTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch("/api/dca/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dca-transactions"] });
      qc.invalidateQueries({ queryKey: ["dca-plans"] });
      qc.invalidateQueries({ queryKey: ["portfolio"] });
      toast.success("Transaksi DCA berhasil dicatat & portfolio diperbarui");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteDcaTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/dca/transactions/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dca-transactions"] });
      toast.success("Transaksi DCA dihapus");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
