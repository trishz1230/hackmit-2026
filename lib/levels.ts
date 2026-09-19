import type { Cadence } from './types';

export const MIN_LEVELS = 3;
export const MAX_LEVELS = 20;

export function clampLevelCount(n: number) {
  if (!Number.isFinite(n)) return 7;
  return Math.min(MAX_LEVELS, Math.max(MIN_LEVELS, Math.round(n)));
}

export function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

const CADENCE_DAYS: Record<Cadence, number> = { daily: 1, every_3_days: 3, weekly: 7 };

/**
 * A level runs until local midnight `cadence` days after it started, so a
 * family that posts everything in one evening still waits for the turnover.
 */
export function levelUnlocksAt(startedAt: string | undefined, cadence: Cadence): number {
  const start = startedAt ? new Date(startedAt) : new Date();
  const at = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  at.setDate(at.getDate() + CADENCE_DAYS[cadence]);
  return at.getTime();
}

export function describeWait(unlocksAt: number, now = Date.now()): string {
  const hours = Math.ceil((unlocksAt - now) / 3_600_000);
  if (hours <= 1) return 'in under an hour';
  if (hours < 24) return `in ${hours} hours`;
  const days = Math.ceil(hours / 24);
  return `in ${days} days`;
}
