import type { Reaction } from './types';

export type EmojiTally = {
  value: string;
  count: number;
  /** True when this device's user is one of the reactors. */
  mine: boolean;
  /** Who reacted, for the tooltip-style line under a post. */
  userIds: string[];
};

/** Discord-style: one pill per emoji with the family's count, most used first. */
export function tallyEmoji(reactions: Reaction[], userId: string): EmojiTally[] {
  const order: string[] = [];
  const byValue = new Map<string, EmojiTally>();
  for (const r of reactions) {
    if (r.kind !== 'emoji' || !r.value) continue;
    const tally = byValue.get(r.value);
    if (!tally) {
      order.push(r.value);
      byValue.set(r.value, {
        value: r.value,
        count: 1,
        mine: r.userId === userId,
        userIds: [r.userId],
      });
      continue;
    }
    tally.count += 1;
    tally.mine = tally.mine || r.userId === userId;
    tally.userIds.push(r.userId);
  }
  return order
    .map((v) => byValue.get(v) as EmojiTally)
    .sort((a, b) => b.count - a.count || order.indexOf(a.value) - order.indexOf(b.value));
}
