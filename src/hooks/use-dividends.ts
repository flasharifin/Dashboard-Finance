import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

async function apiFetch(url: string, options: RequestInit) {
  const res = await fetch(url, options);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Terjadi kesalahan");
  return json;
}

export function useDividends() {
  return useQuery({
    queryKey: ["dividends"],
    queryFn: () => fetch("/api/dividends").then((r) => r.json()).then((r) => r.data ?? []),
  });
}

export function useAddDividend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch("/api/dividends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dividends"] });
      toast.success("Dividen berhasil ditambahkan");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateDividend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiFetch(`/api/dividends/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dividends"] });
      toast.success("Dividen berhasil diperbarui");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteDividend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/dividends/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dividends"] });
      toast.success("Dividen berhasil dihapus");
    },
  });
}
