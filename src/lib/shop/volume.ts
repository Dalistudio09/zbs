export const ML_STEP = 5;

export function priceForMl(pricePer5: number, ml: number): number {
  return Math.round((pricePer5 * ml) / ML_STEP);
}

export function maxMl(stock: number): number {
  const units = Math.max(0, Math.floor(stock));
  if (units <= 0) return ML_STEP;
  return Math.min(100, units * ML_STEP);
}

export function clampMl(ml: number, stock: number): number {
  const max = maxMl(stock);
  const stepped = Math.round((Number(ml) || ML_STEP) / ML_STEP) * ML_STEP;
  return Math.min(max, Math.max(ML_STEP, stepped));
}
