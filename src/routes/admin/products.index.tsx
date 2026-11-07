import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { adminProducts, adminToggleVisible } from "@/fn/admin";
import { formatKzt } from "@/lib/shop/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/products/")({
  loader: () => adminProducts(),
  component: ProductsPage,
});

function ProductsPage() {
  const initial = Route.useLoaderData();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => adminProducts(),
    initialData: initial,
  });
  const products = q.data ?? [];

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="font-display text-4xl">Товары</h1>
        <Link to="/admin/products/new">
          <Button>
            <Plus className="mr-1 size-4" />
            Добавить товар
          </Button>
        </Link>
      </div>
      {products.length === 0 ? (
        <p className="py-12 text-center text-muted">Пока нет ароматов. Добавьте первый.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {products.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-lg bg-elevated p-2">
              <Link
                to="/admin/products/$id"
                params={{ id: p.id }}
                className="flex min-w-0 flex-1 items-center gap-3 no-underline"
              >
                {p.coverUrl ? (
                  <img src={p.coverUrl} alt="" className="size-16 rounded-md object-cover" />
                ) : (
                  <div className="size-16 rounded-md bg-surface" />
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="text-xs text-muted">
                    {formatKzt(p.priceKzt)} / 5 мл
                  </p>
                </div>
              </Link>
              <label className="flex flex-col items-center gap-1 pr-2 text-[10px] text-muted">
                на витрине
                <input
                  type="checkbox"
                  checked={p.visible && p.availability !== "hidden"}
                  className="size-5 accent-accent"
                  onChange={async (e) => {
                    await adminToggleVisible({ data: { id: p.id, visible: e.target.checked } });
                    await qc.invalidateQueries({ queryKey: ["admin-products"] });
                    await qc.invalidateQueries({ queryKey: ["catalog"] });
                  }}
                />
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
