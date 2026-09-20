/**
 * What the family's photos and voice notes actually contain, read by the
 * deployed function (api/describe.ts): a caption per photo, a transcript per
 * recording. Every answer is cached on the device, so a post is read once and
 * later prompts reuse it for free. Anything that fails simply stays undescribed
 * and the prompt falls back to captions alone.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Post } from './types';

const DEPLOYED_DESCRIBE_API = 'https://hackmit-2026.vercel.app/api/describe';

const DESCRIBE_API = process.env.EXPO_PUBLIC_DESCRIBE_API || DEPLOYED_DESCRIBE_API;

/** Matches api/describe.ts, which reads at most this many in one request. */
const MAX_ITEMS = 8;

const keyFor = (postId: string) => `famstreak.described.${postId}`;

const memory = new Map<string, string>();

async function cached(postId: string): Promise<string | null> {
  const held = memory.get(postId);
  if (held !== undefined) return held;
  const saved = await AsyncStorage.getItem(keyFor(postId)).catch(() => null);
  if (saved !== null) memory.set(postId, saved);
  return saved;
}

/**
 * Photo captions and voice transcripts by post id, for the newest posts that
 * have media. Locally held recordings (file:// while offline) are skipped —
 * the server can only read what it can fetch.
 */
export async function describeMedia(posts: Post[]): Promise<Record<string, string>> {
  const media = posts
    .filter((p) => p.kind !== 'text' && p.content.startsWith('http'))
    .slice(0, MAX_ITEMS);
  if (media.length === 0) return {};

  const described: Record<string, string> = {};
  const missing: { id: string; kind: 'photo' | 'voice'; url: string }[] = [];
  for (const post of media) {
    const known = await cached(post.id);
    if (known !== null) {
      if (known) described[post.id] = known;
    } else {
      missing.push({ id: post.id, kind: post.kind as 'photo' | 'voice', url: post.content });
    }
  }
  if (missing.length === 0) return described;

  try {
    const res = await fetch(DESCRIBE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: missing }),
    });
    if (!res.ok) return described;

    const data = (await res.json()) as { described?: Record<string, string> };
    for (const item of missing) {
      const text = data.described?.[item.id]?.trim() ?? '';
      // An empty answer is cached too: a photo the model can't read stays
      // unreadable, and retrying it on every prompt costs the family time.
      memory.set(item.id, text);
      await AsyncStorage.setItem(keyFor(item.id), text).catch(() => {});
      if (text) described[item.id] = text;
    }
    return described;
  } catch {
    return described;
  }
}
