import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

async function apiFetch(url: string, options: RequestInit) {
  const res = await fetch(url, options);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Terjadi kesalahan");
  return json;
}

// ── DCA Plans ─────────────────────────────────────────────────────

export function useDcaPlans() {
  return useQuery({
    queryKey: ["dca-plans"],
    queryFn: () => fetch("/api/dca/plans").then((r) => r.json()).then((r) => r.data ?? []),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dca-plans"] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dca-plans"] }),
  });
}

export function useDeleteDcaPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/dca/plans/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dca-plans"] }),
  });
}

// ── DCA Transactions ──────────────────────────────────────────────

export function useDcaTransactions() {
  return useQuery({
    queryKey: ["dca-transactions"],
    queryFn: () => fetch("/api/dca/transactions").then((r) => r.json()).then((r) => r.data ?? []),
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
    },
  });
}

export function useDeleteDcaTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/dca/transactions/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dca-transactions"] }),
  });
}
