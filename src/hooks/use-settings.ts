import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useSettings() {
  return useQuery<{ wealthTarget: number }>({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()).then((r) => r.data),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { wealthTarget: number }) =>
      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}
