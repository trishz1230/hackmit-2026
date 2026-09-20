/**
 * Names for the two weekly stat cards. The winners come from real counts
 * (lib/week.ts); this only asks the deployed function (api/stats.ts) what to
 * call the categories, so they change week to week. The names are cached per
 * week so a week keeps the wording it opened with, and the hardcoded pair is
 * used whenever the endpoint is missing or fails.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FamilyContext } from './prompts';

const DEPLOYED_STATS_API = 'https://hackmit-2026.vercel.app/api/stats';

const STATS_API = process.env.EXPO_PUBLIC_STATS_API || DEPLOYED_STATS_API;

export type StatLabels = { talked: string; quiet: string };

export const DEFAULT_LABELS: StatLabels = { talked: 'Most talked', quiet: 'Least responsive' };

const keyFor = (groupId: string, weekStart: Date) =>
  `famstreak.weekLabels.${groupId}.${weekStart.toDateString()}`;

export async function weekLabels(
  groupId: string,
  weekStart: Date,
  context: FamilyContext,
): Promise<StatLabels> {
  const key = keyFor(groupId, weekStart);
  const cached = await AsyncStorage.getItem(key).catch(() => null);
  if (cached) {
    const saved = JSON.parse(cached) as Partial<StatLabels>;
    if (saved.talked && saved.quiet) return { talked: saved.talked, quiet: saved.quiet };
  }

  try {
    const res = await fetch(STATS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context }),
    });
    if (!res.ok) return DEFAULT_LABELS;

    const data = (await res.json()) as Partial<StatLabels>;
    if (!data.talked?.trim() || !data.quiet?.trim()) return DEFAULT_LABELS;

    const labels = { talked: data.talked.trim(), quiet: data.quiet.trim() };
    await AsyncStorage.setItem(key, JSON.stringify(labels)).catch(() => {});
    return labels;
  } catch {
    return DEFAULT_LABELS;
  }
}
