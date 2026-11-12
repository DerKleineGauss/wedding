import { QueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { errorText, getApi, type Api } from "./api";

/** Modul-Singleton: alle React-Islands einer Seite teilen Cache und Client. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 10_000, refetchInterval: 20_000, refetchOnWindowFocus: true, retry: 1 },
  },
});

export const qk = {
  public: ["public"] as const,
  admin: ["admin"] as const,
  plan: ["plan"] as const,
  rides: ["rides"] as const,
};

export const api = (): Api => getApi();

export function usePublic() {
  return useQuery({ queryKey: qk.public, queryFn: () => api().loadPublic() });
}

export function useIsAdmin() {
  return useQuery({
    queryKey: qk.admin,
    queryFn: async () => (await api().hasSession()) && (await api().isAdmin()),
    staleTime: Infinity,
    refetchInterval: false,
  });
}

export function usePlan(enabled: boolean) {
  return useQuery({ queryKey: qk.plan, queryFn: () => api().loadPlan(), enabled });
}

export function useRides() {
  return useQuery({ queryKey: qk.rides, queryFn: () => api().loadRides(), retry: 0 });
}

/**
 * Schreibvorgang mit Toast und anschließendem Neuladen der betroffenen Queries.
 * `ok` = Erfolgsmeldung (leer = keine).
 */
export function useWrite<V>(fn: (v: V) => Promise<unknown>, opts: { ok?: string | ((v: V) => string); invalidate?: readonly (readonly string[])[] } = {}) {
  return useMutation({
    mutationFn: fn,
    onSuccess: (_d, v) => {
      const msg = typeof opts.ok === "function" ? opts.ok(v) : opts.ok;
      if (msg) toast.success(msg);
    },
    onError: (e) => toast.error(errorText(e)),
    onSettled: () =>
      Promise.all((opts.invalidate ?? [qk.public]).map((k) => queryClient.invalidateQueries({ queryKey: k }))),
  });
}
