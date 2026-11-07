import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { VolumePicker } from "@/components/shop/volume-picker";
import { GENDER_LABEL, formatKzt } from "@/lib/shop/format";
import { useCart } from "@/lib/shop/cart";
import { priceForMl } from "@/lib/shop/volume";
import type { Product } from "@/lib/shop/types";

export function ProductCard({ product }: { product: Product }) {
  const stock = Number(product.attributes.stock ?? 0);
  const [ml, setMl] = useState(5);
  const add = useCart((s) => s.add);
  const price = priceForMl(product.priceKzt, ml);
  const gender = product.attributes.gender ? GENDER_LABEL[product.attributes.gender] : "";

  return (
    <article className="flex flex-col gap-2">
      <Link to="/p/$id" params={{ id: product.id }} className="group block no-underline text-fg">
        <div className="overflow-hidden rounded-lg bg-surface">
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
        </div>
        <div className="mt-2 flex flex-col gap-0.5">
          {product.brand ? (
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{product.brand}</p>
          ) : null}
          <h2 className="font-display text-lg leading-tight text-fg">{product.name}</h2>
          {product.attributes.family ? (
            <p className="text-xs text-faint">{product.attributes.family}</p>
          ) : null}
          {gender ? <p className="text-[11px] text-muted">{gender}</p> : null}
          {product.description ? (
            <p className="line-clamp-2 text-xs leading-snug text-muted">{product.description}</p>
          ) : null}
        </div>
      </Link>
      <p className="text-[11px] text-faint">остаток {stock} шт</p>
      <VolumePicker value={ml} stock={stock} onChange={setMl} />
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-medium tabular-nums">{formatKzt(price)}</p>
        <p className="text-[10px] text-faint">за 5 мл {formatKzt(product.priceKzt)}</p>
      </div>
      <button
        type="button"
        disabled={stock <= 0 || product.availability !== "in_stock"}
        className="min-h-10 rounded-md bg-accent text-sm font-medium text-accent-fg disabled:opacity-40"
        onClick={() => {
          add(product.id, ml);
          toast.success("В корзине", { description: `${product.name}, ${ml} мл` });
        }}
      >
        В корзину
      </button>
    </article>
  );
}
