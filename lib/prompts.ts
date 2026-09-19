/**
 * Task prompts. Uses the OpenAI API when EXPO_PUBLIC_OPENAI_API_KEY is set
 * (put it in .env), otherwise falls back to the hardcoded list so the app
 * still works with zero configuration.
 *
 * The key ships in the client bundle — fine for a demo, but move generation
 * behind a server function before this is public.
 */
import { taskPrompts } from './mockData';

const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? '';

const SYSTEM = [
  'You invent daily prompts for a family app.',
  'Each prompt asks every family member to share one photo or a couple of sentences about their day.',
  'Keep it under 60 characters, warm, concrete, and answerable by a teenager and a grandparent alike.',
  'Reply with the prompt only — no quotes, no numbering.',
].join(' ');

function fallback(exclude: string[]): string {
  const unused = taskPrompts.filter((p) => !exclude.includes(p));
  const pool = unused.length > 0 ? unused : taskPrompts;
  return pool[Math.floor(Math.random() * pool.length)];
}

export async function generatePrompt(recent: string[] = []): Promise<string> {
  if (!apiKey) return fallback(recent);

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 1,
        max_tokens: 40,
        messages: [
          { role: 'system', content: SYSTEM },
          {
            role: 'user',
            content: recent.length
              ? `Give me a new prompt. Don't repeat these: ${recent.join('; ')}`
              : 'Give me a prompt.',
          },
        ],
      }),
    });

    if (!res.ok) return fallback(recent);
    const data = await res.json();
    const text: string | undefined = data?.choices?.[0]?.message?.content;
    return text?.trim().replace(/^["']|["']$/g, '') || fallback(recent);
  } catch {
    return fallback(recent);
  }
}
