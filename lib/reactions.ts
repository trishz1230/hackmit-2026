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

/** Keeps what someone typed to a single emoji, so pills stay readable. */
export function firstEmoji(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const chars = Array.from(trimmed);
  const emoji: string[] = [];
  for (const ch of chars) {
    const code = ch.codePointAt(0) ?? 0;
    const joiner = code === 0x200d || code === 0xfe0f;
    const modifier = code >= 0x1f3fb && code <= 0x1f3ff;
    if (emoji.length > 0 && !joiner && !modifier && emoji[emoji.length - 1] !== '\u200d') break;
    emoji.push(ch);
  }
  const value = emoji.join('');
  // Letters and digits aren't emoji, so don't let them become a reaction.
  return /\p{Extended_Pictographic}/u.test(value) ? value : null;
}
