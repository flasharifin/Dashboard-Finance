import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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
      fetch("/api/dividends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dividends"] }),
  });
}

export function useDeleteDividend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/dividends/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dividends"] }),
  });
}
