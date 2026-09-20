/**
 * Which model the serverless functions talk to. Meta's Model API is the one we
 * build on (Muse Spark for words and photos, Muse Voice Transcribe for
 * recordings); it speaks the OpenAI chat-completions wire format, so OpenAI
 * stays usable as a fallback when only OPENAI_API_KEY is set.
 *
 * Set MODEL_API_KEY in the Vercel project settings to run on Muse.
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

export function provider(): Provider | null {
  const muse = process.env.MODEL_API_KEY;
  if (muse) {
    return {
      name: 'muse',
      base: 'https://api.meta.ai/v1',
      key: muse,
      chat: process.env.MUSE_MODEL || 'muse-spark-1.3',
    };
  }

  const openai = process.env.OPENAI_API_KEY;
  if (openai) {
    return { name: 'openai', base: 'https://api.openai.com/v1', key: openai, chat: 'gpt-4o-mini' };
  }

  return null;
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
