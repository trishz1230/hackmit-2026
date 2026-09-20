import type { Post } from './types';

/** Shown instead of the prompt on a share made after the task was answered. */
export const EXTRA_PROMPT = 'btw...also...';

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
