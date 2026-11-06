import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type CatalogFilters = {
  brand: string;
  volume: "all" | "30" | "50" | "100";
  minPrice: string;
  maxPrice: string;
};

export const EMPTY_FILTERS: CatalogFilters = {
  brand: "all",
  volume: "all",
  minPrice: "",
  maxPrice: "",
};

export function countActiveFilters(f: CatalogFilters): number {
  let n = 0;
  if (f.brand !== "all") n += 1;
  if (f.volume !== "all") n += 1;
  if (f.minPrice.trim()) n += 1;
  if (f.maxPrice.trim()) n += 1;
  return n;
}

const VOLUME: Array<{ id: CatalogFilters["volume"]; label: string }> = [
  { id: "all", label: "Все" },
  { id: "30", label: "30 мл" },
  { id: "50", label: "50 мл" },
  { id: "100", label: "100 мл" },
];

export function FilterSheet({
  open,
  value,
  brands,
  onClose,
  onApply,
}: {
  open: boolean;
  value: CatalogFilters;
  brands: string[];
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
            <div className="flex flex-wrap gap-2">
              <Chip
                active={draft.brand === "all"}
                onClick={() => setDraft({ ...draft, brand: "all" })}
              >
                Все
              </Chip>
              {brands.map((b) => (
                <Chip
                  key={b}
                  active={draft.brand === b}
                  onClick={() => setDraft({ ...draft, brand: b })}
                >
                  {b}
                </Chip>
              ))}
            </div>
          </Section>

          <Section title="Объём">
            <div className="flex flex-wrap gap-2">
              {VOLUME.map((v) => (
                <Chip
                  key={v.id}
                  active={draft.volume === v.id}
                  onClick={() => setDraft({ ...draft, volume: v.id })}
                >
                  {v.label}
                </Chip>
              ))}
            </div>
          </Section>

          <Section title="Цена">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <input
                inputMode="numeric"
                placeholder="от"
                value={draft.minPrice}
                onChange={(e) =>
                  setDraft({ ...draft, minPrice: e.target.value.replace(/[^\d]/g, "") })
                }
                className="min-h-12 rounded-md border border-border bg-elevated px-3 text-sm text-fg outline-none placeholder:text-faint focus:border-accent"
              />
              <span className="text-faint">—</span>
              <input
                inputMode="numeric"
                placeholder="до"
                value={draft.maxPrice}
                onChange={(e) =>
                  setDraft({ ...draft, maxPrice: e.target.value.replace(/[^\d]/g, "") })
                }
                className="min-h-12 rounded-md border border-border bg-elevated px-3 text-sm text-fg outline-none placeholder:text-faint focus:border-accent"
              />
            </div>
          </Section>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-border bg-surface px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            className="min-h-12 rounded-md border border-border text-sm text-fg"
            onClick={() => {
              onApply(EMPTY_FILTERS);
              onClose();
            }}
          >
            Сбросить
          </button>
          <button
            type="button"
            className="min-h-12 rounded-md bg-accent text-sm font-medium text-accent-fg"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
          >
            Показать
          </button>
        </div>
      </div>
    </div>
  );
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
        "min-h-11 rounded-full border px-3.5 text-sm",
        active ? "border-accent bg-accent text-accent-fg" : "border-border bg-transparent text-muted",
      )}
    >
      {children}
    </button>
  );
}
