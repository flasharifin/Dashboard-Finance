import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";

export function useNetWorth() {
  return useQuery({
    queryKey: ["networth"],
    queryFn: () => fetch("/api/networth").then((r) => r.json()).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useNetWorthSnapshots() {
  return useQuery<{
    id: string;
    snapshotDate: string;
    netValue: string | number;
    totalAssets: string | number;
    totalLiabilities: string | number;
    portfolioValue: string | number | null;
  }[]>({
    queryKey: ["networth-snapshots"],
    queryFn: () =>
      fetch("/api/networth/snapshot").then((r) => r.json()).then((r) => r.data ?? []),
    staleTime: 30 * 60 * 1000,
  });
}

export function useDeleteSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/networth/snapshot/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["networth-snapshots"] });
      toast.success("Snapshot dihapus");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCreateSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (portfolioValueIDR: number) =>
      apiFetch("/api/networth/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolioValueIDR }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["networth-snapshots"] });
      queryClient.invalidateQueries({ queryKey: ["networth"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiFetch(`/api/networth/assets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["networth"] });
      toast.success("Aset berhasil diperbarui");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateLiability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiFetch(`/api/networth/liabilities/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["networth"] });
      toast.success("Hutang berhasil diperbarui");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAddAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch("/api/networth/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["networth"] });
      toast.success("Aset berhasil ditambahkan");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/networth/assets/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["networth"] });
      toast.success("Aset berhasil dihapus");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAddLiability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch("/api/networth/liabilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["networth"] });
      toast.success("Hutang berhasil ditambahkan");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteLiability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/networth/liabilities/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["networth"] });
      toast.success("Hutang berhasil dihapus");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
