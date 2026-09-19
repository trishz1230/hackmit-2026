export const MIN_LEVELS = 3;
export const MAX_LEVELS = 20;

export function clampLevelCount(n: number) {
  if (!Number.isFinite(n)) return 7;
  return Math.min(MAX_LEVELS, Math.max(MIN_LEVELS, Math.round(n)));
}

export function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}
