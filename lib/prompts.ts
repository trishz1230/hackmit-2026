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

/** Paste your deployed function URL here once, e.g. https://famstreak.vercel.app/api/prompt */
const DEPLOYED_PROMPT_API = '';

const PROMPT_API = process.env.EXPO_PUBLIC_PROMPT_API || DEPLOYED_PROMPT_API;

function fallback(exclude: string[]): string {
  const unused = taskPrompts.filter((p) => !exclude.includes(p));
  const pool = unused.length > 0 ? unused : taskPrompts;
  return pool[Math.floor(Math.random() * pool.length)];
}

export async function generatePrompt(recent: string[] = []): Promise<string> {
  if (!PROMPT_API) return fallback(recent);

  try {
    const res = await fetch(PROMPT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recent }),
    });
    if (!res.ok) return fallback(recent);

    const data = (await res.json()) as { prompt?: string };
    return data.prompt?.trim() || fallback(recent);
  } catch {
    return fallback(recent);
  }
}
