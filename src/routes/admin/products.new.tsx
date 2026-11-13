import { createFileRoute } from "@tanstack/react-router";
import { ProductForm } from "@/components/admin/product-form";

export const Route = createFileRoute("/admin/products/new")({
  component: NewProductPage,
});

function NewProductPage() {
  return (
    <div>
      <h1 className="mb-6 font-display text-4xl">Новый аромат</h1>
      <ProductForm />
    </div>
  );
}
