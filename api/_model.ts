/**
 * Which model each serverless function talks to. The two jobs are split on
 * purpose: Muse reads the family (photos, recordings, words) and writes the
 * next prompt, OpenAI judges the week (what the two stat cards are called and
 * who each one lands on). Meta's Model API speaks the OpenAI chat-completions
 * wire format, so one `chat()` covers both, and either provider stands in for
 * the other when only one key is configured.
 *
 * Set MODEL_API_KEY (Muse) and OPENAI_API_KEY in the Vercel project settings.
 * Underscore-prefixed files in api/ are shared code, not routes.
 */
export type Provider = {
  name: 'muse' | 'openai';
  base: string;
  key: string;
  /** Chat model, used for prompts, stat names and reading photos. */
  chat: string;
};

export const VOICE_MODEL = process.env.MUSE_VOICE_MODEL || 'muse-voice-transcribe-1.0';

function muse(): Provider | null {
  const key = process.env.MODEL_API_KEY;
  if (!key) return null;
  return {
    name: 'muse',
    base: 'https://api.meta.ai/v1',
    key,
    chat: process.env.MUSE_MODEL || 'muse-spark-1.3',
  };
}

function openai(): Provider | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return { name: 'openai', base: 'https://api.openai.com/v1', key, chat: 'gpt-4o-mini' };
}

/** The provider for this job, or the other one when its key is missing. */
export function provider(want: 'muse' | 'openai'): Provider | null {
  return want === 'muse' ? muse() ?? openai() : openai() ?? muse();
}

/** A chat message, in the format both providers accept. */
export type Message = {
  role: 'system' | 'user';
  content: string | { type: string; [key: string]: unknown }[];
};

type ChatCompletion = { choices?: { message?: { content?: string } }[] };

/** The completion's text, or '' if the call failed. */
export async function chat(
  p: Provider,
  messages: Message[],
  opts: { maxTokens?: number; temperature?: number } = {},
): Promise<string> {
  const res = await fetch(`${p.base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${p.key}` },
    body: JSON.stringify({
      model: p.chat,
      max_tokens: opts.maxTokens ?? 60,
      ...(opts.temperature === undefined ? {} : { temperature: opts.temperature }),
      messages,
    }),
  });
  if (!res.ok) return '';

  const data = (await res.json()) as ChatCompletion;
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}
