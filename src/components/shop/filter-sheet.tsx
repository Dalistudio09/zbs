import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type CatalogFilters = {
  brand: string;
  family: string;
  gender: "all" | "unisex" | "female" | "male";
};

export const EMPTY_FILTERS: CatalogFilters = {
  brand: "all",
  family: "all",
  gender: "all",
};

export function countActiveFilters(f: CatalogFilters): number {
  let n = 0;
  if (f.brand !== "all") n += 1;
  if (f.family !== "all") n += 1;
  if (f.gender !== "all") n += 1;
  return n;
}

const GENDER: Array<{ id: CatalogFilters["gender"]; label: string }> = [
  { id: "all", label: "Все" },
  { id: "unisex", label: "Унисекс" },
  { id: "female", label: "Женский" },
  { id: "male", label: "Мужской" },
];

export function FilterSheet({
  open,
  value,
  brands,
  families,
  onClose,
  onApply,
}: {
  open: boolean;
  value: CatalogFilters;
  brands: string[];
  families: string[];
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

          <Section title="Семейство">
            <div className="flex flex-wrap gap-2">
              <Chip
                active={draft.family === "all"}
                onClick={() => setDraft({ ...draft, family: "all" })}
              >
                Все
              </Chip>
              {families.map((f) => (
                <Chip
                  key={f}
                  active={draft.family === f}
                  onClick={() => setDraft({ ...draft, family: f })}
                >
                  {f}
                </Chip>
              ))}
            </div>
          </Section>

          <Section title="Пол">
            <div className="flex flex-wrap gap-2">
              {GENDER.map((g) => (
                <Chip
                  key={g.id}
                  active={draft.gender === g.id}
                  onClick={() => setDraft({ ...draft, gender: g.id })}
                >
                  {g.label}
                </Chip>
              ))}
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
