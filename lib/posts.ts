import type { Post, Task } from './types';

/** Shown instead of the prompt on a share made after the task was answered. */
export const EXTRA_PROMPT = 'btw...also...';

/** When a level started and when the next one took over, as timestamps. */
export function levelWindow(tasks: Task[], level: number): { since: number; until: number } {
  const at = (t: Task) => (t.createdAt ? Date.parse(t.createdAt) : 0);
  const starts = tasks.filter((t) => t.level === level).map(at);
  const later = tasks
    .filter((t) => t.level > level)
    .map(at)
    .sort((a, b) => a - b);
  return { since: starts.length ? Math.max(...starts) : 0, until: later[0] ?? Infinity };
}

/**
 * The level the feeds should show: the newest one somebody has answered, so a
 * level nobody has started yet doesn't empty the feed.
 */
export function feedLevel(tasks: Task[], posts: Post[], current: number): number {
  const answered = tasks
    .filter((t) => t.level <= current && posts.some((p) => p.taskId === t.id))
    .map((t) => t.level);
  return answered.length ? Math.max(...answered) : current;
}

/** Posts made while a level was the current one. */
export function withinLevel(posts: Post[], tasks: Task[], level: number): Post[] {
  const { since, until } = levelWindow(tasks, level);
  return posts.filter((p) => {
    const at = Date.parse(p.createdAt);
    return at >= since && at < until;
  });
}

/** An extra share: a hangout post, or anything after your first answer to the same task. */
export function isExtraPost(post: Post, posts: Post[]): boolean {
  if (post.taskId === '') return true;
  return posts.some(
    (p) =>
      p.userId === post.userId &&
      p.taskId === post.taskId &&
      (p.createdAt < post.createdAt || (p.createdAt === post.createdAt && p.id < post.id))
  );
}
