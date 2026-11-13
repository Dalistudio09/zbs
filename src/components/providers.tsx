import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Toaster } from "sonner";

export function ShopProviders({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 8_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          style: {
            background: "#1c1916",
            color: "#f3ede4",
            border: "1px solid rgb(243 237 228 / 12%)",
          },
        }}
      />
    </QueryClientProvider>
  );
}
