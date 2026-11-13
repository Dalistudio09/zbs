import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/shop/types";

export type GenderFilter = "unisex" | "female" | "male";

export type CatalogFilters = {
  brands: string[];
  families: string[];
  genders: GenderFilter[];
};

export const EMPTY_FILTERS: CatalogFilters = {
  brands: [],
  families: [],
  genders: [],
};

export function countActiveFilters(f: CatalogFilters): number {
  return f.brands.length + f.families.length + f.genders.length;
}

const GENDER: Array<{ id: GenderFilter; label: string }> = [
  { id: "unisex", label: "Унисекс" },
  { id: "female", label: "Женский" },
  { id: "male", label: "Мужской" },
];

const PREVIEW = 8;

export function FilterSheet({
  open,
  value,
  brands,
  families,
  products,
  query,
  onClose,
  onApply,
}: {
  open: boolean;
  value: CatalogFilters;
  brands: string[];
  families: string[];
  products: Product[];
  query: string;
  onClose: () => void;
  onApply: (next: CatalogFilters) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [dy, setDy] = useState(0);
  const drag = useRef({ active: false, start: 0 });

  useEffect(() => {
    if (open) {
      setDraft(value);
      setDy(0);
    }
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const found = useMemo(
    () => countMatches(products, draft, query),
    [products, draft, query],
  );

  if (!open) return null;

  function finishDrag(finalY: number) {
    drag.current.active = false;
    if (finalY > 88) {
      onClose();
      setDy(0);
      return;
    }
    setDy(0);
  }

  function toggleBrand(id: string) {
    setDraft({ ...draft, brands: toggle(draft.brands, id) });
  }
  function toggleFamily(id: string) {
    setDraft({ ...draft, families: toggle(draft.families, id) });
  }
  function toggleGender(id: GenderFilter) {
    setDraft({ ...draft, genders: toggle(draft.genders, id) });
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="exist-dim absolute inset-0 bg-bg/75"
        aria-label="Закрыть фильтры"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Фильтры"
        className="exist-sheet absolute inset-x-0 bottom-0 flex max-h-[90dvh] flex-col rounded-t-xl bg-surface shadow-[0_-12px_40px_rgb(0_0_0_/_45%)]"
        style={
          dy
            ? { transform: `translateY(${dy}px)`, animation: "none" }
            : undefined
        }
      >
        <div
          className="flex shrink-0 touch-none flex-col items-center pt-2"
          onPointerDown={(e) => {
            drag.current = { active: true, start: e.clientY };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!drag.current.active) return;
            setDy(Math.max(0, e.clientY - drag.current.start));
          }}
          onPointerUp={(e) => finishDrag(Math.max(0, e.clientY - drag.current.start))}
          onPointerCancel={() => finishDrag(dy)}
        >
          <div className="h-1 w-10 rounded-full bg-border" />
          <p className="mt-3 font-display text-2xl text-fg">Фильтры</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-5">
          <Section title="Бренд">
            <ChipGroup
              items={brands.map((b) => ({ id: b, label: b }))}
              selected={draft.brands}
              onToggle={toggleBrand}
            />
          </Section>
          <Section title="Семейство">
            <ChipGroup
              items={families.map((f) => ({ id: f, label: f }))}
              selected={draft.families}
              onToggle={toggleFamily}
            />
          </Section>
          <Section title="Пол">
            <ChipGroup
              items={GENDER}
              selected={draft.genders}
              onToggle={toggleGender}
            />
          </Section>
        </div>

        <div className="flex shrink-0 gap-2 border-t border-border bg-surface px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            className="min-h-12 shrink-0 rounded-md border border-border px-4 text-sm text-fg"
            onClick={() => {
              onApply(EMPTY_FILTERS);
              onClose();
            }}
          >
            Сбросить
          </button>
          <button
            type="button"
            className="min-h-12 min-w-0 flex-1 rounded-md bg-accent px-3 text-sm font-medium text-accent-fg"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
          >
            {showLabel(found)}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChipGroup<T extends string>({
  items,
  selected,
  onToggle,
}: {
  items: Array<{ id: T; label: string }>;
  selected: T[];
  onToggle: (id: T) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const collapsible = items.length > PREVIEW;
  const visible = collapsible && !expanded ? previewItems(items, selected) : items;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {visible.map((item) => (
          <Chip
            key={item.id}
            active={selected.includes(item.id)}
            onClick={() => onToggle(item.id)}
          >
            {item.label}
          </Chip>
        ))}
      </div>
      {collapsible ? (
        <button
          type="button"
          className="mt-2 min-h-10 text-sm text-accent"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Свернуть" : "Показать все"}
        </button>
      ) : null}
    </div>
  );
}

function previewItems<T extends string>(items: Array<{ id: T; label: string }>, selected: T[]) {
  const picked = items.filter((item) => selected.includes(item.id));
  if (picked.length >= PREVIEW) return picked;
  const rest = items.filter((item) => !selected.includes(item.id));
  return [...picked, ...rest.slice(0, PREVIEW - picked.length)];
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-6">
      <p className="mb-2 text-sm font-medium text-muted">{title}</p>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full border px-3.5 text-sm",
        active ? "border-accent bg-accent text-accent-fg" : "border-border bg-transparent text-muted",
      )}
    >
      {children}
    </button>
  );
}

function toggle<T extends string>(list: T[], id: T): T[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

function countMatches(products: Product[], filters: CatalogFilters, query: string) {
  const q = query.trim().toLowerCase();
  const brands = filters.brands.map((b) => b.toLowerCase());
  const families = filters.families.map((f) => f.toLowerCase());
  return products.filter((p) => {
    if (q && !p.name.toLowerCase().includes(q)) return false;
    if (brands.length && !brands.includes((p.brand ?? "").toLowerCase())) return false;
    if (families.length && !families.includes((p.attributes.family ?? "").trim().toLowerCase())) return false;
    if (filters.genders.length && !filters.genders.includes(p.attributes.gender as GenderFilter)) return false;
    return true;
  }).length;
}

function showLabel(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  let word = "товаров";
  if (mod100 < 11 || mod100 > 14) {
    if (mod10 === 1) word = "товар";
    else if (mod10 >= 2 && mod10 <= 4) word = "товара";
  }
  return `Показать ${n} ${word}`;
}
