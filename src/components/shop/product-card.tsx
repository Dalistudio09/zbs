import { Link } from "@tanstack/react-router";
import { BRAND_MARK } from "@/lib/shop/brand";
import { formatKzt } from "@/lib/shop/format";
import { cardMeta } from "@/lib/shop/schema";
import type { Product } from "@/lib/shop/types";

export function ProductCard({ product }: { product: Product }) {
  const discount =
    product.oldPriceKzt && product.oldPriceKzt > product.priceKzt
      ? Math.round((1 - product.priceKzt / product.oldPriceKzt) * 100)
      : 0;
  const meta = cardMeta(product);

  return (
    <Link
      to="/p/$id"
      params={{ id: product.id }}
      className="group block no-underline text-fg"
    >
      <article className="flex flex-col gap-3">
        <div className="relative overflow-hidden rounded-lg bg-surface">
          {product.coverUrl ? (
            <img
              src={product.coverUrl}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="aspect-[3/4] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div className="aspect-[3/4] w-full bg-elevated" />
          )}
          {discount > 0 ? (
            <span className="absolute left-2 top-2 rounded-sm bg-accent px-1.5 py-0.5 text-[11px] font-semibold text-accent-fg">
              −{discount}%
            </span>
          ) : null}
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-[10px] tracking-[0.12em] text-accent/80">{BRAND_MARK}</p>
          {product.brand ? (
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">
              {product.brand}
            </p>
          ) : null}
          <h2 className="font-display text-lg leading-tight text-fg">{product.name}</h2>
          {meta ? <p className="text-xs text-faint">{meta}</p> : null}
          <p className="mt-1 flex items-baseline gap-2 font-medium tabular-nums">
            <span>{formatKzt(product.priceKzt)}</span>
            {product.oldPriceKzt && product.oldPriceKzt > product.priceKzt ? (
              <span className="text-sm text-faint line-through">
                {formatKzt(product.oldPriceKzt)}
              </span>
            ) : null}
          </p>
        </div>
      </article>
    </Link>
  );
}
