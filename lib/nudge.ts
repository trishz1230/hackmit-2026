import type { Post } from './types';

const PREFIX = '::nudge::';

/** Hangout-shaped posts used only to ping a member who hasn't posted. */
export function nudgeTargetId(post: Post): string | null {
  if (post.taskId || post.kind !== 'text' || !post.content.startsWith(PREFIX)) return null;
  return post.content.slice(PREFIX.length).split('\n')[0] || null;
}

export function nudgeContent(memberId: string): string {
  return `${PREFIX}${memberId}`;
}
