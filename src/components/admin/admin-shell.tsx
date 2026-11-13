import { Link, useRouterState } from "@tanstack/react-router";
import { Box, ClipboardList, Settings } from "lucide-react";
import { BRAND_NAME } from "@/lib/shop/brand";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/admin/products", label: "Товары", icon: Box },
  { to: "/admin/orders", label: "Заказы", icon: ClipboardList },
  { to: "/admin/settings", label: "Настройки", icon: Settings },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Link to="/admin/products" className="font-display text-xl tracking-[0.04em] text-fg no-underline">
            {BRAND_NAME}
          </Link>
          <Link to="/" className="text-sm text-muted no-underline">
            Витрина
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 pb-28 pt-5">{children}</div>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
        <ul className="mx-auto grid max-w-3xl grid-cols-3">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] no-underline",
                    active ? "text-accent" : "text-muted",
                  )}
                >
                  <Icon className="size-5" strokeWidth={1.6} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
