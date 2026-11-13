import type { ReactNode } from "react";
import { ShopProviders } from "@/components/providers";

/**
 * App-wide client provider mounted once near the root (in `src/routes/__root.tsx`).
 * Shop query client + toasts live here so the root shell stays stable.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  return <ShopProviders>{children}</ShopProviders>;
}
