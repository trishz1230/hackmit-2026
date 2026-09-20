import type { Post, Profile, Reaction } from './types';

/** Monday 00:00 to Sunday 23:59 around today. */
export function weekRange(now = new Date()): { start: Date; end: Date } {
  const start = new Date(now);
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/** `metric` says what the card measures; its wording is named elsewhere. */
export type WeekStat = { metric: 'talked' | 'quiet'; member: Profile };

const countBy = <T,>(items: T[], id: (item: T) => string) =>
  items.reduce<Record<string, number>>((acc, item) => {
    const key = id(item);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

/**
 * The one member the score singles out, or nobody: a tie for the place we are
 * looking at means the week hasn't picked a winner yet.
 */
const standout = (
  members: Profile[],
  score: Record<string, number>,
  best: 'high' | 'low',
): Profile | undefined => {
  const ranked = members
    .map((member) => ({ member, count: score[member.id] ?? 0 }))
    .sort((a, b) => (best === 'high' ? b.count - a.count : a.count - b.count));
  const [first, second] = ranked;
  if (!first || !second || first.count === second.count) return undefined;
  return first.member;
};

/**
 * Headline stats for the week, read straight off what the family did. A stat
 * is left out entirely unless the week's activity actually names someone, so
 * an empty week shows no cards rather than defaulting to whoever is first.
 */
export function weekStats(
  weekPosts: Post[],
  reactions: Reaction[],
  members: Profile[],
): WeekStat[] {
  if (members.length < 2) return [];

  const weekPostIds = weekPosts.map((p) => p.id);
  const weekReactions = reactions.filter((r) => weekPostIds.includes(r.postId));
  const comments = weekReactions.filter((r) => r.kind === 'comment');

  const talked = countBy([...weekPosts, ...comments], (item) => item.userId);
  const responded = countBy(weekReactions, (r) => r.userId);

  const stats: WeekStat[] = [];
  const mostTalked = weekPosts.length + comments.length > 0
    ? standout(members, talked, 'high')
    : undefined;
  if (mostTalked) stats.push({ metric: 'talked', member: mostTalked });

  // Only meaningful once someone has reacted — otherwise everybody is level.
  const leastResponsive = weekReactions.length > 0
    ? standout(members, responded, 'low')
    : undefined;
  if (leastResponsive && leastResponsive.id !== mostTalked?.id) {
    stats.push({ metric: 'quiet', member: leastResponsive });
  }

  return stats;
}
