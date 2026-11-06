import { Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { useEffect } from "react";
import { BRAND_NAME } from "@/lib/shop/brand";
import { cartCount, useCart } from "@/lib/shop/cart";
import { bootTelegram } from "@/lib/shop/telegram-web";
import type { PublicStore } from "@/lib/shop/types";

export function StoreShell({
  store,
  children,
}: {
  store: PublicStore;
  children: React.ReactNode;
}) {
  const items = useCart((s) => s.items);
  const count = cartCount(items);

  useEffect(() => {
    bootTelegram();
  }, []);

  const raw = store.brandName?.trim() || BRAND_NAME;
  const [first, ...rest] = raw.split(/\s+/);
  const title = first || "ZBS";
  const tag = rest.join(" ") || "parfbar";

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/92 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link to="/" className="flex flex-col justify-center no-underline">
            <span className="font-display text-[22px] leading-none tracking-[0.14em] text-fg">
              {title}
            </span>
            <span className="mt-1 text-[11px] leading-none tracking-[0.06em] text-accent">
              {tag}
            </span>
          </Link>
          <Link
            to="/cart"
            className="relative flex size-11 items-center justify-center text-fg no-underline"
            aria-label="Корзина"
          >
            <ShoppingBag className="size-5" strokeWidth={1.6} />
            {count > 0 ? (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-fg tabular-nums">
                {count}
              </span>
            ) : null}
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 pb-24 pt-5">{children}</div>
    </div>
  );
}

export function ThemeVars({
  color,
  background,
}: {
  color: string;
  background: string;
}) {
  const safe = (v: string, fallback: string) =>
    /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback;
  const accent = safe(color, "#C7A46A");
  const bg = safe(background, "#0E0E0E");
  return (
    <style>{`:root{--color-accent:${accent};--color-bg:${bg};}`}</style>
  );
}
