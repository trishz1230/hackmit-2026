import type { Post, Task } from './types';

/** Shown instead of the prompt on a share made after the task was answered. */
export const EXTRA_PROMPT = 'btw...also...';

/**
 * The row a level is currently being played on. A reset writes a fresh row for
 * every level it climbs back through, so older rows with the same level are
 * runs the family has lost and answers to them no longer count.
 */
export function taskFor(tasks: Task[], level: number): Task | undefined {
  return tasks
    .filter((t) => t.level === level)
    .reduce<Task | undefined>((newest, t) => {
      if (!newest) return t;
      const at = t.createdAt ? Date.parse(t.createdAt) : 0;
      const best = newest.createdAt ? Date.parse(newest.createdAt) : 0;
      return at >= best ? t : newest;
    }, undefined);
}

const stampOf = (tasks: Task[], level: number): number => {
  const at = taskFor(tasks, level)?.createdAt;
  return at ? Date.parse(at) : 0;
};

/**
 * When a level began for the family, or null if it hasn't. A row is stamped as
 * soon as the family can reach it — and a reset re-stamps every row it will
 * climb back through with the same time — so a level only really begins once
 * somebody answers it, and one waiting to open never takes over the level the
 * family is still sharing to.
 */
function levelStart(tasks: Task[], answers: Post[], level: number): number | null {
  const stamped = stampOf(tasks, level);
  const id = taskFor(tasks, level)?.id;
  const first = answers
    .filter((p) => p.taskId === id && Date.parse(p.createdAt) >= stamped)
    .map((p) => Date.parse(p.createdAt))
    .sort((a, b) => a - b)[0];
  return first ?? null;
}

/** When a level started and when the next one took over, as timestamps. */
export function levelWindow(
  tasks: Task[],
  answers: Post[],
  level: number
): { since: number; until: number } {
  const since = levelStart(tasks, answers, level) ?? stampOf(tasks, level);
  const later = tasks
    .filter((t) => t.level > level)
    .map((t) => levelStart(tasks, answers, t.level))
    .filter((start): start is number => start !== null && start > since)
    .sort((a, b) => a - b);
  return { since, until: later[0] ?? Infinity };
}

/**
 * The level the feeds should show: the newest one somebody has answered, so a
 * level nobody has started yet doesn't empty the feed.
 */
export function feedLevel(tasks: Task[], posts: Post[], current: number): number {
  const answered = tasks
    .filter((t) => {
      if (taskFor(tasks, t.level)?.id !== t.id) return false;
      const since = t.createdAt ? Date.parse(t.createdAt) : 0;
      // An answer from before the row was stamped belongs to a run the family
      // has since lost, so it doesn't count as having started this level.
      return (
        t.level <= current &&
        posts.some((p) => p.taskId === t.id && Date.parse(p.createdAt) >= since)
      );
    })
    .map((t) => t.level);
  return answered.length ? Math.max(...answered) : current;
}

/** Whether a member has answered a level's task since the row was stamped. */
export function answeredLevel(
  tasks: Task[],
  posts: Post[],
  level: number,
  userId: string
): boolean {
  const task = taskFor(tasks, level);
  if (!task) return false;
  const since = task.createdAt ? Date.parse(task.createdAt) : 0;
  return posts.some(
    (p) => p.taskId === task.id && p.userId === userId && Date.parse(p.createdAt) >= since
  );
}

/**
 * The level every screen shows: the newest answered one, held back to the
 * level before the current task while that task is still locked, since a
 * prompt nobody can read yet is not a level the family is playing.
 */
export function shownLevel(
  tasks: Task[],
  posts: Post[],
  current: number,
  taskLevel: number,
  taskLocked: boolean
): number {
  const answered = feedLevel(tasks, posts, current);
  return taskLocked ? Math.max(1, Math.min(answered, taskLevel - 1)) : answered;
}

/**
 * Whether hangout (and the ＋ share it takes) is still closed to a member: it
 * waits on the task they can answer right now, so on level 1 nothing is shared
 * before the family is answered. A locked level has no task to answer, so
 * hangout stays open through the wait for it to start.
 */
export function hangoutLocked(
  tasks: Task[],
  posts: Post[],
  level: number,
  userId: string,
  taskLocked: boolean
): boolean {
  return !taskLocked && !answeredLevel(tasks, posts, level, userId);
}

/**
 * Posts belonging to a level: an answer belongs to the level of the task it
 * answers, whatever the clock says, and a hangout post to the level that was
 * running when it was made.
 */
export function withinLevel(
  posts: Post[],
  tasks: Task[],
  level: number,
  answers: Post[] = posts
): Post[] {
  const { since, until } = levelWindow(tasks, answers, level);
  const task = taskFor(tasks, level);
  const stamped = stampOf(tasks, level);
  return posts.filter((p) => {
    const at = Date.parse(p.createdAt);
    if (p.taskId !== '') return p.taskId === task?.id && at >= stamped;
    return at >= since && at < until;
  });
}

/**
 * An extra share: a hangout post, or anything after your first answer to the
 * same task. A task row outlives a reset, so answers from before it was
 * re-stamped belong to the lost run and don't make this one an extra.
 */
export function isExtraPost(post: Post, posts: Post[], tasks: Task[]): boolean {
  if (post.taskId === '') return true;
  const stamp = tasks.find((t) => t.id === post.taskId)?.createdAt;
  const since = stamp ? Date.parse(stamp) : 0;
  return posts.some(
    (p) =>
      p.userId === post.userId &&
      p.taskId === post.taskId &&
      Date.parse(p.createdAt) >= since &&
      (p.createdAt < post.createdAt || (p.createdAt === post.createdAt && p.id < post.id))
  );
}
