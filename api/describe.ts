/**
 * Serverless media reader, deployed on Vercel alongside api/prompt.ts. Turns a
 * family's photos and voice notes into one line of text each, so the prompt
 * generator can build on what is actually in them.
 *
 * Photos go to Muse Spark's vision input, recordings to Muse Voice Transcribe.
 * The client caches every answer, so each post is read once.
 *
 * Deploy: `npx vercel --prod`, with MODEL_API_KEY set in the project settings.
 */
import { chat, provider, VOICE_MODEL, type Provider } from './_model';

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

function describePhoto(url: string, model: Provider): Promise<string> {
  return chat(
    model,
    [
      { role: 'system', content: SEE },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'What is in this photo?' },
          { type: 'image_url', image_url: { url } },
        ],
      },
    ],
    { maxTokens: 60 },
  );
}

/** Muse Voice Transcribe: mono 16-bit PCM WAV only, so the app records WAV. */
async function transcribeWithMuse(blob: Blob, model: Provider): Promise<string> {
  const form = new FormData();
  form.append(
    'request',
    new Blob(
      [JSON.stringify({ model: VOICE_MODEL, audioEncoding: 'WAV', mode: 'PUSH_TO_TALK' })],
      { type: 'application/json' },
    ),
  );
  form.append('audio', blob, 'voice.wav');

  const res = await fetch('https://api.meta.ai/v1/asr/transcribe', {
    method: 'POST',
    headers: { Authorization: `Bearer ${model.key}`, Accept: 'text/plain' },
    body: form,
  });
  if (!res.ok) return '';

  const text = await res.text();
  return text.split('\n').map((l) => l.trim()).filter(Boolean).join(' ');
}

async function transcribeWithWhisper(blob: Blob, url: string, apiKey: string): Promise<string> {
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

async function transcribeVoice(url: string, model: Provider): Promise<string> {
  const audio = await fetch(url);
  if (!audio.ok) return '';
  const blob = await audio.blob();

  const wav = url.split('?')[0].toLowerCase().endsWith('.wav');
  if (model.name === 'muse' && wav) return transcribeWithMuse(blob, model);

  // Recordings made before the app moved to WAV, or an OpenAI-only deployment.
  const openai = process.env.OPENAI_API_KEY;
  return openai ? transcribeWithWhisper(blob, url, openai) : '';
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const model = provider();
  if (!model) return json({ error: 'MODEL_API_KEY is not set on the server' }, 500);

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
            ? await describePhoto(item.url, model)
            : await transcribeVoice(item.url, model);
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
