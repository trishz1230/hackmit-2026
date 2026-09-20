/**
 * Serverless media reader, deployed on Vercel alongside api/prompt.ts. Turns a
 * family's photos and voice notes into one line of text each, so the prompt
 * generator can build on what is actually in them.
 *
 * Photos go to gpt-4o-mini's vision input, recordings to whisper-1. The client
 * caches every answer, so each post is read once.
 *
 * Deploy: `npx vercel --prod`, with OPENAI_API_KEY set in the project settings.
 */
export const config = { runtime: 'edge' };

const SEE = [
  'You caption photos shared inside one family.',
  'Answer with a single sentence under 20 words naming what is in the photo:',
  'people (as "someone", never a guess at a name), place, food, pets, weather, what is happening.',
  'No preamble, no "this image shows".',
].join(' ');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** More than this in one request and a slow phone waits on the whole batch. */
const MAX_ITEMS = 8;

type Item = { id: string; kind: 'photo' | 'voice'; url: string };

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

type ChatCompletion = { choices?: { message?: { content?: string } }[] };

async function describePhoto(url: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 60,
      messages: [
        { role: 'system', content: SEE },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What is in this photo?' },
            { type: 'image_url', image_url: { url, detail: 'low' } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) return '';

  const data = (await res.json()) as ChatCompletion;
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

async function transcribeVoice(url: string, apiKey: string): Promise<string> {
  const audio = await fetch(url);
  if (!audio.ok) return '';
  const blob = await audio.blob();

  const form = new FormData();
  // Whisper picks its decoder off the filename, so keep the recording's suffix.
  const extension = url.split('.').pop()?.split('?')[0] || 'm4a';
  form.append('file', blob, `voice.${extension}`);
  form.append('model', 'whisper-1');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) return '';

  const data = (await res.json()) as { text?: string };
  return data.text?.trim() ?? '';
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return json({ error: 'OPENAI_API_KEY is not set on the server' }, 500);

  const { items = [] } = (await req.json().catch(() => ({}))) as { items?: Item[] };
  const wanted = items
    .filter((i) => i?.id && i?.url?.startsWith('http') && (i.kind === 'photo' || i.kind === 'voice'))
    .slice(0, MAX_ITEMS);

  // One slow or broken file shouldn't cost the family the rest of the batch.
  const read = await Promise.all(
    wanted.map(async (item) => {
      try {
        const text =
          item.kind === 'photo'
            ? await describePhoto(item.url, apiKey)
            : await transcribeVoice(item.url, apiKey);
        return [item.id, text.slice(0, 300)] as const;
      } catch {
        return [item.id, ''] as const;
      }
    })
  );

  const described: Record<string, string> = {};
  for (const [id, text] of read) if (text) described[id] = text;
  return json({ described });
}
