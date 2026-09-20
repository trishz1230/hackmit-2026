import type { Cadence, Group, Post, Task } from './types';

/**
 * Posts that count towards a task. A re-issued task (the missed-period reset)
 * keeps its row but moves its start, so earlier posts stop counting.
 */
export function postsForTask(posts: Post[], task: Task): Post[] {
  const from = task.createdAt ? Date.parse(task.createdAt) : 0;
  return posts.filter((p) => p.taskId === task.id && Date.parse(p.createdAt) >= from);
}

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

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** A task created this soon after midnight belongs to the period that just began. */
const OPEN_GRACE_MS = 10 * 60_000;

/**
 * When the level's task becomes readable and postable, on the member's own
 * device clock. A level that is created at the turnover opens straight away;
 * one created mid-day (a family catching up on an overdue level) waits for the
 * next local midnight, so nobody sees the next conversation early. Level 1 is
 * always open: a family that just signed up shouldn't be told to come back.
 */
export function levelOpensAt(startedAt: string | undefined, level = 1): number {
  const start = startedAt ? new Date(startedAt) : new Date();
  if (level <= 1) return startOfDay(start).getTime();
  const midnight = startOfDay(start);
  if (start.getTime() - midnight.getTime() <= OPEN_GRACE_MS) return midnight.getTime();
  const next = new Date(midnight);
  next.setDate(next.getDate() + 1);
  return next.getTime();
}

/**
 * A level runs until local midnight `cadence` days after its period opened, so
 * a family that posts everything in one evening still waits for the turnover.
 */
export function levelUnlocksAt(
  startedAt: string | undefined,
  cadence: Cadence,
  level = 1
): number {
  const at = startOfDay(new Date(levelOpensAt(startedAt, level)));
  at.setDate(at.getDate() + CADENCE_DAYS[cadence]);
  return at.getTime();
}

/**
 * Displayed streak: every level below the current one, plus the current level
 * once everybody has answered it. The count pins at the goal once the map is
 * finished, so the bar, the streak and the map all agree.
 */
export function streakCount(group: Group, everyonePosted: boolean): number {
  const done = group.level - 1 + (everyonePosted || group.awaitingNextGoal ? 1 : 0);
  return Math.max(0, Math.min(group.goal, done));
}

export function describeWait(unlocksAt: number, now = Date.now()): string {
  const hours = Math.ceil((unlocksAt - now) / 3_600_000);
  if (hours <= 1) return 'in under an hour';
  if (hours < 24) return `in ${hours} hours`;
  const days = Math.ceil(hours / 24);
  return `in ${days} days`;
}
