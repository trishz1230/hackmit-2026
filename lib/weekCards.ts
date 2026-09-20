/**
 * The two weekly stat cards, written by the deployed function (api/stats.ts):
 * it names both categories from what the family did this week and says which
 * member each one lands on. Cached per week so a week keeps the cards it opened
 * with, and the counted fallback (lib/week.ts) covers a missing or failing
 * endpoint.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FamilyContext } from './prompts';
import type { Tally } from './week';

const DEPLOYED_STATS_API = 'https://hackmit-2026.vercel.app/api/stats';

const STATS_API = process.env.EXPO_PUBLIC_STATS_API || DEPLOYED_STATS_API;

/** `who` is a member's name, or '' when the week didn't single anyone out. */
export type WeekCard = { label: string; who: string };

const keyFor = (groupId: string, weekStart: Date) =>
  `famstreak.weekCards.${groupId}.${weekStart.toDateString()}`;

/** One failed call is enough: the endpoint stays unreachable for this session. */
let unavailable = false;

const valid = (cards: unknown): cards is WeekCard[] =>
  Array.isArray(cards) &&
  cards.length === 2 &&
  cards.every((c) => typeof c?.label === 'string' && c.label.trim() !== '');

export async function weekCards(
  groupId: string,
  weekStart: Date,
  context: FamilyContext,
  tallies: Tally[],
): Promise<WeekCard[] | null> {
  const key = keyFor(groupId, weekStart);
  const cached = await AsyncStorage.getItem(key).catch(() => null);
  if (cached) {
    const saved = JSON.parse(cached) as unknown;
    if (valid(saved)) return saved;
  }

  if (unavailable) return null;

  try {
    const res = await fetch(STATS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context: { family: context.family, said: context.said }, tallies }),
    });
    if (!res.ok) {
      unavailable = true;
      return null;
    }

    const { cards } = (await res.json()) as { cards?: unknown };
    if (!valid(cards)) return null;

    await AsyncStorage.setItem(key, JSON.stringify(cards)).catch(() => {});
    return cards;
  } catch {
    unavailable = true;
    return null;
  }
}
