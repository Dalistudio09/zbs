import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ImagePlus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { adminDeleteProduct, adminSaveProduct } from "@/fn/admin";
import { compressImageFile } from "@/lib/shop/compress";
import type { Gender, Product, ProductAttributes, ProductNotes } from "@/lib/shop/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

type DraftImage = { id?: string; src: string; dataBase64?: string };

function listed(product?: Product | null) {
  if (!product) return true;
  return product.visible && product.availability !== "hidden" && Number(product.attributes.stock ?? 1) > 0;
}

export function ProductForm({ product }: { product?: Product | null }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState(product?.name ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [price, setPrice] = useState(product ? String(product.priceKzt) : "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [family, setFamily] = useState(product?.attributes.family ?? "");
  const [gender, setGender] = useState<Gender>(product?.attributes.gender ?? "unisex");
  const [onShelf, setOnShelf] = useState(listed(product));
  const notes = (product?.attributes.notes ?? {}) as ProductNotes;
  const [top, setTop] = useState(notes.top ?? "");
  const [heart, setHeart] = useState(notes.heart ?? "");
  const [base, setBase] = useState(notes.base ?? "");
  const [images, setImages] = useState<DraftImage[]>(
    product?.images.map((i) => ({ id: i.id, src: i.src })) ?? [],
  );
  const [busy, setBusy] = useState(false);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const next = [...images];
    for (const file of Array.from(files)) {
      if (next.length >= 5) break;
      try {
        const data = await compressImageFile(file);
        next.push({ src: data, dataBase64: data });
      } catch {
        toast.error("Не удалось сжать фото");
      }
    }
    setImages(next);
  }

  function imageUrl(img: DraftImage): string | undefined {
    if (img.dataBase64) return undefined;
    if (!img.src || img.src.startsWith("data:") || img.src.startsWith("/api/images/")) return undefined;
    return img.src;
  }

  async function onSave() {
    if (!name.trim() || !brand.trim()) {
      toast.error("Укажите бренд и название");
      return;
    }
    if (images.length === 0) {
      toast.error("Добавьте фото");
      return;
    }
    setBusy(true);
    try {
      const attributes: ProductAttributes = {
        gender,
        family: family.trim(),
        stock: onShelf ? Math.max(1, Number(product?.attributes.stock ?? 1)) : 0,
        year: product?.attributes.year,
        perfumer: product?.attributes.perfumer,
        notes: { top, heart, base },
        storyTitle: product?.attributes.storyTitle,
        story: product?.attributes.story,
      };
      const result = await adminSaveProduct({
        data: {
          id: product?.id,
          name,
          brand,
          sku: product?.sku ?? "",
          priceKzt: Number(price.replace(/\s/g, "")),
          oldPriceKzt: null,
          description,
          availability: onShelf ? "in_stock" : "hidden",
          visible: onShelf,
          attributes,
          images: images.map((img) => ({
            id: img.id,
            dataBase64: img.dataBase64,
            url: imageUrl(img),
            mime: "image/jpeg",
          })),
        },
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      await qc.invalidateQueries({ queryKey: ["catalog"] });
      await qc.invalidateQueries({ queryKey: ["admin-products"] });
      await qc.invalidateQueries({ queryKey: ["product"] });
      toast.success("Сохранено");
      navigate({ to: "/admin/products" });
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!product?.id || busy) return;
    if (!window.confirm(`Удалить «${product.name}»?`)) return;
    setBusy(true);
    try {
      await adminDeleteProduct({ data: { id: product.id } });
      await qc.invalidateQueries({ queryKey: ["catalog"] });
      await qc.invalidateQueries({ queryKey: ["admin-products"] });
      await qc.invalidateQueries({ queryKey: ["product"] });
      toast.success("Удалено");
      navigate({ to: "/admin/products" });
    } catch {
      toast.error("Не удалось удалить");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm text-muted">Фото</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {images.map((img, i) => (
            <div key={`${img.id ?? "n"}-${i}`} className="relative overflow-hidden rounded-md bg-surface">
              <img src={img.src} alt="" className="aspect-[3/4] w-full object-cover" />
              <button
                type="button"
                className="absolute right-1 top-1 flex size-8 items-center justify-center rounded-full bg-bg/80 text-fg"
                onClick={() => setImages(images.filter((_, j) => j !== i))}
                aria-label="Удалить фото"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
          {images.length < 5 ? (
            <label className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-elevated text-muted">
              <ImagePlus className="size-6" strokeWidth={1.4} />
              <span className="text-xs">Добавить</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  void onFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          ) : null}
        </div>
      </div>

      <Field label="Бренд">
        <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="By Kilian" />
      </Field>
      <Field label="Название">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Angels' Share" />
      </Field>
      <Field label="Цена за 5 мл, ₸">
        <Input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="21000" />
      </Field>
      <Field label="Описание">
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <Field label="Пол">
        <Select value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
          <option value="unisex">Унисекс</option>
          <option value="female">Женский</option>
          <option value="male">Мужской</option>
        </Select>
      </Field>
      <Field label="Семейство">
        <Input value={family} onChange={(e) => setFamily(e.target.value)} placeholder="Восточные гурманские" />
      </Field>
      <Field label="Верх">
        <Input value={top} onChange={(e) => setTop(e.target.value)} />
      </Field>
      <Field label="Сердце">
        <Input value={heart} onChange={(e) => setHeart(e.target.value)} />
      </Field>
      <Field label="База">
        <Input value={base} onChange={(e) => setBase(e.target.value)} />
      </Field>
      <label className="flex min-h-12 items-center justify-between gap-3 rounded-md bg-elevated px-4">
        <span className="text-sm">В наличии</span>
        <input
          type="checkbox"
          checked={onShelf}
          onChange={(e) => setOnShelf(e.target.checked)}
          className="size-5 accent-accent"
        />
      </label>
      <Button block disabled={busy} onClick={() => void onSave()}>
        {busy ? "Сохраняю…" : "Сохранить"}
      </Button>
      {product ? (
        <Button variant="danger" block disabled={busy} onClick={() => void onDelete()}>
          Удалить товар
        </Button>
      ) : null}
      <Button variant="ghost" block disabled={busy} onClick={() => navigate({ to: "/admin/products" })}>
        Отмена
      </Button>
    </div>
  );
}
