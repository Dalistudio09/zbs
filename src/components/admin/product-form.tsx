import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ImagePlus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { adminDeleteProduct, adminSaveProduct } from "@/fn/admin";
import { compressImageFile } from "@/lib/shop/compress";
import type { Product, ProductAttributes, ProductNotes } from "@/lib/shop/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

const VOLUMES = ["30 мл", "50 мл", "100 мл"] as const;

type DraftImage = { id?: string; src: string; dataBase64?: string };

function onShelf(product?: Product | null) {
  if (!product) return true;
  return product.visible && product.availability !== "hidden";
}

function keptUrl(img: DraftImage): string | undefined {
  if (img.dataBase64 || !img.src) return undefined;
  if (img.src.startsWith("data:") || img.src.startsWith("/api/images/")) return undefined;
  return img.src;
}

export function ProductForm({ product }: { product?: Product | null }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState(product?.name ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [price, setPrice] = useState(product ? String(product.priceKzt) : "");
  const [oldPrice, setOldPrice] = useState(
    product?.oldPriceKzt ? String(product.oldPriceKzt) : "",
  );
  const [description, setDescription] = useState(product?.description ?? "");
  const [listed, setListed] = useState(onShelf(product));
  const [volume, setVolume] = useState(product?.attributes.volume || "50 мл");
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

  async function onSave() {
    if (images.length === 0) {
      toast.error("Добавьте хотя бы одно фото");
      return;
    }
    if (!name.trim()) {
      toast.error("Укажите название");
      return;
    }
    setBusy(true);
    try {
      const attributes: ProductAttributes = {
        gender: product?.attributes.gender ?? "unisex",
        volume,
        notes: { top, heart, base },
      };
      const result = await adminSaveProduct({
        data: {
          id: product?.id,
          name,
          brand,
          sku: product?.sku ?? "",
          priceKzt: Number(price.replace(/\s/g, "")),
          oldPriceKzt: oldPrice ? Number(oldPrice.replace(/\s/g, "")) : null,
          description,
          availability: listed ? "in_stock" : "hidden",
          visible: listed,
          attributes,
          images: images.map((img) => ({
            id: img.id,
            dataBase64: img.dataBase64,
            url: keptUrl(img),
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
      toast.success(listed ? "Сохранено — уже на витрине" : "Сохранено, скрыто с витрины");
      navigate({ to: "/admin/products" });
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!product) return;
    if (!confirm("Удалить этот аромат?")) return;
    setBusy(true);
    try {
      await adminDeleteProduct({ data: { id: product.id } });
      await qc.invalidateQueries({ queryKey: ["catalog"] });
      await qc.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Удалено");
      navigate({ to: "/admin/products" });
    } finally {
      setBusy(false);
    }
  }

  const volumeOptions = (VOLUMES as readonly string[]).includes(volume)
    ? [...VOLUMES]
    : [volume, ...VOLUMES];

  return (
    <div className="flex flex-col gap-6">
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
                multiple
                className="hidden"
                onChange={(e) => {
                  void onFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-faint">Первое фото — на карточке. До 5 кадров.</p>
      </div>

      <Field label="Бренд">
        <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Atelier Qazaq" />
      </Field>
      <Field label="Название">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Silk Steppe" />
      </Field>
      <Field label="Объём">
        <Select value={volume} onChange={(e) => setVolume(e.target.value)}>
          {volumeOptions.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Цена, ₸">
        <Input
          inputMode="numeric"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="24900"
        />
      </Field>
      <Field label="Старая цена" hint="Необязательно">
        <Input
          inputMode="numeric"
          value={oldPrice}
          onChange={(e) => setOldPrice(e.target.value)}
          placeholder="31900"
        />
      </Field>
      <Field label="Описание">
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="1–2 предложения про аромат"
        />
      </Field>
      <Field label="Верх">
        <Input value={top} onChange={(e) => setTop(e.target.value)} placeholder="бергамот, груша" />
      </Field>
      <Field label="Сердце">
        <Input value={heart} onChange={(e) => setHeart(e.target.value)} placeholder="пион, жасмин" />
      </Field>
      <Field label="База">
        <Input value={base} onChange={(e) => setBase(e.target.value)} placeholder="мускус, сандал" />
      </Field>
      <label className="flex min-h-12 items-center justify-between gap-3 rounded-md bg-elevated px-4">
        <span className="text-sm">В наличии / на витрине</span>
        <input
          type="checkbox"
          checked={listed}
          onChange={(e) => setListed(e.target.checked)}
          className="size-5 accent-accent"
        />
      </label>

      <div className="flex flex-col gap-2">
        <Button block disabled={busy} onClick={() => void onSave()}>
          {busy ? "Сохраняю…" : "Сохранить"}
        </Button>
        {product ? (
          <Button variant="danger" block disabled={busy} onClick={() => void onDelete()}>
            <Trash2 className="mr-2 size-4" />
            Удалить
          </Button>
        ) : null}
      </div>
    </div>
  );
}
