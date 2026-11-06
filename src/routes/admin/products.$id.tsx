import { createFileRoute } from "@tanstack/react-router";
import { ProductForm } from "@/components/admin/product-form";
import { adminProduct } from "@/fn/admin";

export const Route = createFileRoute("/admin/products/$id")({
  loader: ({ params }) => adminProduct({ data: { id: params.id } }),
  component: EditProductPage,
});

function EditProductPage() {
  const product = Route.useLoaderData();
  if (!product) {
    return <p className="text-muted">Товар не найден</p>;
  }
  return (
    <div>
      <h1 className="mb-6 font-display text-4xl">Редактировать</h1>
      <ProductForm product={product} />
    </div>
  );
}
