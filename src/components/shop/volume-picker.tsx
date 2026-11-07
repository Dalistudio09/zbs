import { Minus, Plus } from "lucide-react";
import { clampMl, maxMl, ML_STEP } from "@/lib/shop/volume";

export function VolumePicker({
  value,
  stock,
  onChange,
}: {
  value: number;
  stock: number;
  onChange: (ml: number) => void;
}) {
  const units = Math.max(stock, 1);
  const max = maxMl(units);
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label="Меньше"
        disabled={value <= ML_STEP}
        className="flex size-9 items-center justify-center rounded-md bg-elevated text-fg disabled:opacity-30"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onChange(clampMl(value - ML_STEP, units));
        }}
      >
        <Minus className="size-3.5" />
      </button>
      <span className="min-w-12 text-center text-sm tabular-nums">{value} мл</span>
      <button
        type="button"
        aria-label="Больше"
        disabled={value >= max}
        className="flex size-9 items-center justify-center rounded-md bg-elevated text-fg disabled:opacity-30"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onChange(clampMl(value + ML_STEP, units));
        }}
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
