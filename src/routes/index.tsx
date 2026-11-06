import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import {
  countActiveFilters,
  EMPTY_FILTERS,
  FilterSheet,
  type CatalogFilters,
} from "@/components/shop/filter-sheet";
import { ProductCard } from "@/components/shop/product-card";
import { StoreShell } from "@/components/shop/store-shell";
import { fetchCatalog, fetchStore } from "@/fn/public";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [store, products] = await Promise.all([fetchStore(), fetchCatalog()]);
    return { store, products };
  },
  component: Storefront,
});

function Storefront() {
  const initial = Route.useLoaderData();
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<CatalogFilters>(EMPTY_FILTERS);
  const [sheetOpen, setSheetOpen] = useState(false);
  const active = countActiveFilters(filters);

  const query = useMemo(() => {
    const min = filters.minPrice.trim() ? Number(filters.minPrice) : undefined;
    const max = filters.maxPrice.trim() ? Number(filters.maxPrice) : undefined;
    return {
      q,
      brand: filters.brand === "all" ? undefined : filters.brand,
      volume: filters.volume === "all" ? undefined : filters.volume,
      minPrice: Number.isFinite(min) ? min : undefined,
      maxPrice: Number.isFinite(max) ? max : undefined,
    };
  }, [q, filters]);

  const hasExtra = Boolean(query.q || query.brand || query.volume || query.minPrice || query.maxPrice);

  const catalog = useQuery({
    queryKey: ["catalog", query],
    queryFn: () => fetchCatalog({ data: query }),
    initialData: hasExtra ? undefined : initial.products,
    staleTime: 0,
  });

  const storeQ = useQuery({
    queryKey: ["store"],
    queryFn: () => fetchStore(),
    initialData: initial.store,
  });

  const store = storeQ.data ?? initial.store;
  const products = catalog.data ?? [];
  const empty = !catalog.isLoading && products.length === 0;
  const brands = useMemo(() => {
    const set = new Set<string>();
    for (const p of initial.products) {
      if (p.brand?.trim()) set.add(p.brand.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b, "ru"));
  }, [initial.products]);

  return (
    <StoreShell store={store}>
      <div className="mb-5 flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Название или бренд"
            className="min-h-12 w-full rounded-md border border-border bg-elevated py-3 pl-10 pr-4 text-sm text-fg outline-none placeholder:text-faint focus:border-accent"
          />
        </div>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label="Фильтры"
          className="relative flex size-12 shrink-0 items-center justify-center rounded-md border border-border bg-elevated text-fg"
        >
          <SlidersHorizontal className="size-5" strokeWidth={1.6} />
          {active > 0 ? (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-fg tabular-nums">
              {active}
            </span>
          ) : null}
        </button>
      </div>

      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1">
        <BrandChip
          active={filters.brand === "all"}
          onClick={() => setFilters({ ...filters, brand: "all" })}
        >
          Все
        </BrandChip>
        {brands.map((b) => (
          <BrandChip
            key={b}
            active={filters.brand === b}
            onClick={() => setFilters({ ...filters, brand: filters.brand === b ? "all" : b })}
          >
            {b}
          </BrandChip>
        ))}
      </div>

      {catalog.isLoading ? (
        <div className="grid grid-cols-2 gap-x-3 gap-y-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <div className="aspect-[3/4] animate-pulse rounded-lg bg-surface" />
              <div className="h-3 w-1/2 rounded bg-elevated" />
              <div className="h-4 w-3/4 rounded bg-elevated" />
            </div>
          ))}
        </div>
      ) : empty ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="font-display text-3xl text-fg">Пока нет ароматов</p>
          <p className="mt-2 max-w-xs text-sm text-muted">
            Продавец ещё наполняет витрину. Загляните чуть позже.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      <p className="mt-16 pb-2 text-center">
        <Link to="/admin" className="text-[11px] text-faint no-underline">
          вход
        </Link>
      </p>

      <FilterSheet
        open={sheetOpen}
        value={filters}
        brands={brands}
        onClose={() => setSheetOpen(false)}
        onApply={setFilters}
      />
    </StoreShell>
  );
}

function BrandChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3.5 py-2 text-sm",
        active ? "border-accent bg-accent text-accent-fg" : "border-border bg-transparent text-muted",
      )}
    >
      {children}
    </button>
  );
}
