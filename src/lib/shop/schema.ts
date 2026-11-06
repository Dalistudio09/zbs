import type { CatalogField } from "./types";

/** White-label catalog fields. Perfume now; flowers later swap volume → bouquet. */
export const CATALOG_FIELDS: CatalogField[] = [
  { key: "brand", label: "Бренд", type: "text" },
  {
    key: "gender",
    label: "Пол",
    type: "select",
    filter: true,
    options: [
      { value: "female", label: "Женский" },
      { value: "male", label: "Мужской" },
      { value: "unisex", label: "Унисекс" },
    ],
  },
  {
    key: "volume",
    label: "Объём",
    type: "select",
    options: [
      { value: "30 мл", label: "30 мл" },
      { value: "50 мл", label: "50 мл" },
      { value: "100 мл", label: "100 мл" },
    ],
  },
  { key: "notes", label: "Ноты", type: "notes" },
];

export function cardMeta(product: {
  attributes: { volume?: string; gender?: string };
}): string {
  return product.attributes.volume ?? "";
}
