import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type UserSettings = {
  wealthTarget:       number;
  goalName:           string | null;
  goalDeadline:       string | null; // ISO string
  goalReturnPct:      number;
  goalMonthlyContrib: number | null;
};

export function useSettings() {
  return useQuery<UserSettings>({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()).then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<UserSettings>) =>
      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}
