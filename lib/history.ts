import type { Post, Task } from './types';

/** Local calendar day of a timestamp, as YYYY-MM-DD. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Midday so the date survives being read back in any timezone. */
export const dayDate = (key: string) => new Date(`${key}T12:00:00`);

export type HistoryDay = {
  key: string;
  count: number;
  /** The level the family was on that day, when the day had a task post. */
  level?: number;
};

/**
 * Every day the family put something up, newest first. Built from the posts
 * themselves rather than the family's progress, so the record survives a goal
 * being completed and the path starting over.
 */
export function historyDays(posts: Post[], tasks: Task[]): HistoryDay[] {
  const levelOf = new Map(tasks.map((t) => [t.id, t.level]));
  const days = new Map<string, HistoryDay>();

  for (const post of posts) {
    const key = dayKey(post.createdAt);
    const day = days.get(key) ?? { key, count: 0 };
    day.count += 1;
    day.level = day.level ?? levelOf.get(post.taskId);
    days.set(key, day);
  }

  return [...days.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
}
