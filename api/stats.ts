/**
 * Serverless namer for the two weekly stat cards, deployed on Vercel alongside
 * api/prompt.ts. The app works out who each card points at from real counts;
 * this only invents what the two categories are called this week.
 *
 * Deploy: `npx vercel --prod`, then set OPENAI_API_KEY in the project settings.
 */
export const config = { runtime: 'edge' };

const SYSTEM = [
  'You name two award categories for a family app\'s weekly recap.',
  'The first goes to whoever posted and commented the most; the second to whoever reacted the least.',
  'Base the wording on what the family actually posted that week when you can',
  '(a trip, a pet, a meal, a running joke), otherwise keep it general.',
  'Each name is at most 30 characters, lowercase, warm and playful, like a question or an exclamation.',
  'No names of people, no quotes.',
  'Reply with exactly two lines: the first category, then the second.',
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

const clean = (line: string) => line.replace(/^[-*\d.\s]+/, '').replace(/^["']|["']$/g, '').trim();

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return json({ error: 'OPENAI_API_KEY is not set on the server' }, 500);

  const { context = {} } = (await req.json().catch(() => ({}))) as {
    context?: { family?: string; members?: string[]; said?: string[] };
  };

  const ask = [
    'Name this week\'s two categories.',
    context.family ? `The family calls itself "${context.family}".` : '',
    context.said?.length
      ? `This week they posted:\n${context.said.map((s) => `- ${s}`).join('\n')}`
      : 'They posted photos and voice notes with nothing written down.',
  ]
    .filter(Boolean)
    .join('\n');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 1,
      max_tokens: 30,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: ask },
      ],
    }),
  });

  if (!res.ok) return json({ error: `OpenAI returned ${res.status}` }, 502);

  const data = (await res.json()) as ChatCompletion;
  const lines = (data.choices?.[0]?.message?.content ?? '')
    .split('\n')
    .map(clean)
    .filter(Boolean);
  if (lines.length < 2) return json({ error: 'Empty completion' }, 502);

  return json({ talked: lines[0].slice(0, 30), quiet: lines[1].slice(0, 30) });
}
