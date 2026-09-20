/**
 * Serverless judge for the two weekly stat cards, deployed on Vercel alongside
 * api/prompt.ts. Runs on OpenAI (Muse writes the prompts; this reads the week
 * back). It invents both categories from scratch every week — they are not a
 * fixed pair — and picks which member each one lands on, from that member's
 * posts, comments and reactions.
 *
 * Deploy: `npx vercel --prod`, then set OPENAI_API_KEY in the project settings.
 */
import { chat, provider } from './_model';

export const config = { runtime: 'edge' };

const SYSTEM = [
  'You write a family app\'s weekly recap as exactly two award cards.',
  'Invent both categories fresh from what this family actually did that week',
  '(a trip, a pet, a meal, a running joke, who never replies, who posts at 2am);',
  'they must not be the same two as a generic week, and one of them should be affectionate',
  'about somebody being quiet rather than only celebrating the loudest.',
  'You are given each member with their counts: posts, comments they left, reactions they gave.',
  'Award each card to the one member the counts and the posts actually support.',
  'Each label is at most 30 characters, lowercase, warm and playful, and names no people.',
  'Reply with exactly two lines, each "label | member name", and nothing else.',
].join(' ');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** A member's week, as counted on the device. */
type Tally = { name: string; posts: number; comments: number; reactions: number };

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

const clean = (text: string) => text.replace(/^[-*\d.\s]+/, '').replace(/^["']|["']$/g, '').trim();

/** "label | name" as written, with the name matched back to a real member. */
function card(line: string, tallies: Tally[]): { label: string; who: string } | null {
  const [label, who = ''] = line.split('|').map(clean);
  if (!label) return null;

  const named = tallies.find((t) => t.name.toLowerCase() === who.toLowerCase());
  return { label: label.slice(0, 30), who: named?.name ?? '' };
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const model = provider('openai');
  if (!model) return json({ error: 'OPENAI_API_KEY is not set on the server' }, 500);

  const { context = {}, tallies = [] } = (await req.json().catch(() => ({}))) as {
    context?: { family?: string; said?: string[] };
    tallies?: Tally[];
  };
  if (tallies.length < 2) return json({ error: 'Need at least two members' }, 400);

  const ask = [
    "Write this week's two cards.",
    context.family ? `The family calls itself "${context.family}".` : '',
    'Members this week:',
    ...tallies.map(
      (t) => `- ${t.name}: ${t.posts} posts, ${t.comments} comments, ${t.reactions} reactions`,
    ),
    context.said?.length
      ? `What they shared:\n${context.said.map((s) => `- ${s}`).join('\n')}`
      : 'Nothing they shared had words in it.',
  ]
    .filter(Boolean)
    .join('\n');

  const said = await chat(
    model,
    [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: ask },
    ],
    { maxTokens: 60, temperature: 1 },
  );

  const cards = said
    .split('\n')
    .map((line) => card(line, tallies))
    .filter((c): c is { label: string; who: string } => c !== null)
    .slice(0, 2);
  if (cards.length < 2) return json({ error: 'Empty completion' }, 502);

  return json({ cards });
}
