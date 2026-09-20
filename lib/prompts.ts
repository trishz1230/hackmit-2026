/**
 * Task prompts. Calls the deployed prompt function (api/prompt.ts), which holds
 * the OpenAI key server-side so nobody needs local configuration. Falls back to
 * the hardcoded list whenever that endpoint is missing or fails, so the app
 * always works.
 *
 * Point PROMPT_API at your own deployment, or override it per machine with
 * EXPO_PUBLIC_PROMPT_API.
 */
import { taskPrompts } from './mockData';
import type { Post, Profile } from './types';

/** Paste your deployed function URL here once, e.g. https://famstreak.vercel.app/api/prompt */
const DEPLOYED_PROMPT_API = 'https://hackmit-2026.vercel.app/api/prompt';

const PROMPT_API = process.env.EXPO_PUBLIC_PROMPT_API || DEPLOYED_PROMPT_API;

function fallback(exclude: string[]): string {
  const unused = taskPrompts.filter((p) => !exclude.includes(p));
  const pool = unused.length > 0 ? unused : taskPrompts;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** What the family has been sharing, so the next prompt can pick it up. */
export type FamilyContext = {
  family?: string;
  members?: string[];
  /** Recent posts as "Name: what they said", newest first. */
  said?: string[];
};

/**
 * The last dozen things the family shared, as "Name: words". Photos and voice
 * notes contribute their caption plus, when `described` has been fetched
 * (lib/describe.ts), what the image shows or the recording says.
 */
export function familyContext(
  family: string,
  members: Profile[],
  posts: Post[],
  described: Record<string, string> = {},
): FamilyContext {
  const said = [...posts]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 12)
    .map((p) => {
      const who = members.find((m) => m.id === p.userId)?.name;
      if (!who) return '';

      const words = (p.kind === 'text' ? p.content : (p.caption ?? '')).trim().slice(0, 140);
      const read = described[p.id]?.trim().slice(0, 200) ?? '';
      const media =
        p.kind === 'photo' && read
          ? `(photo: ${read})`
          : p.kind === 'voice' && read
            ? `(said out loud: ${read})`
            : '';

      const line = [words, media].filter(Boolean).join(' ');
      return line ? `${who}: ${line}` : '';
    })
    .filter(Boolean);

  return { family, members: members.map((m) => m.name), said };
}

export async function generatePrompt(
  recent: string[] = [],
  context: FamilyContext = {},
): Promise<string> {
  if (!PROMPT_API) return fallback(recent);

  try {
    const res = await fetch(PROMPT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recent, context }),
    });
    if (!res.ok) return fallback(recent);

    const data = (await res.json()) as { prompt?: string };
    return data.prompt?.trim() || fallback(recent);
  } catch {
    return fallback(recent);
  }
}
