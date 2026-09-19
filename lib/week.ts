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

export type WeekStat = { label: string; member?: Profile };

const countBy = <T,>(items: T[], id: (item: T) => string) =>
  items.reduce<Record<string, number>>((acc, item) => {
    const key = id(item);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

const pick = (members: Profile[], score: Record<string, number>, best: 'high' | 'low') =>
  members
    .slice()
    .sort((a, b) => {
      const diff = (score[a.id] ?? 0) - (score[b.id] ?? 0);
      return best === 'high' ? -diff : diff;
    })
    .at(0);

/**
 * Two headline stats for the week, read straight off what the family did:
 * who said the most, and who the family is still waiting on.
 */
export function weekStats(
  weekPosts: Post[],
  reactions: Reaction[],
  members: Profile[],
): WeekStat[] {
  if (members.length === 0) return [];

  const weekPostIds = weekPosts.map((p) => p.id);
  const weekReactions = reactions.filter((r) => weekPostIds.includes(r.postId));
  const comments = weekReactions.filter((r) => r.kind === 'comment');

  const talked = countBy([...weekPosts, ...comments], (item) =>
    'userId' in item ? item.userId : '',
  );
  const responded = countBy(weekReactions, (r) => r.userId);

  return [
    { label: 'Most talked', member: pick(members, talked, 'high') },
    { label: 'Least responsive', member: pick(members, responded, 'low') },
  ];
}
