/**
 * Serverless prompt generator, deployed on Vercel. The OpenAI key lives here as
 * an environment variable so nobody has to configure anything locally.
 *
 * Deploy: `npx vercel --prod`, then set OPENAI_API_KEY in the project settings.
 */
export const config = { runtime: 'edge' };

const SYSTEM = [
  'You invent daily prompts for a family app.',
  'Each prompt asks every family member to share one photo or a couple of sentences about their day.',
  'Keep it under 60 characters, warm, concrete, and answerable by a teenager and a grandparent alike.',
  'Reply with the prompt only — no quotes, no numbering.',
].join(' ');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

type ChatCompletion = { choices?: { message?: { content?: string } }[] };

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return json({ error: 'OPENAI_API_KEY is not set on the server' }, 500);

  const { recent = [] } = (await req.json().catch(() => ({}))) as { recent?: string[] };

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

  if (!res.ok) return json({ error: `OpenAI returned ${res.status}` }, 502);

  const data = (await res.json()) as ChatCompletion;
  const prompt = data.choices?.[0]?.message?.content?.trim().replace(/^["']|["']$/g, '');
  if (!prompt) return json({ error: 'Empty completion' }, 502);

  return json({ prompt });
}
