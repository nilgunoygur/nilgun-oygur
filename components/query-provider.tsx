"use client";

import { useState } from "react";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";

declare module "@tanstack/react-query" {
  /** `errorToast`: what a failed fetch says; `true` uses the error's own message. */
  interface Register { queryMeta: { errorToast?: string | true } }
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    queryCache: new QueryCache({ onError: (error, query) => { const text = query.meta?.errorToast; if (text) toast.error(text === true ? error.message : text); } }),
    mutationCache: new MutationCache({ onError: error => { toast.error(error.message); } }),
    defaultOptions: {
    queries: { staleTime: 30_000, gcTime: 300_000, retry: 1, refetchOnWindowFocus: true, refetchOnReconnect: true },
    mutations: { retry: 0 },
  } }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
