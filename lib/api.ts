/**
 * Every read/write against Supabase lives here; the UI only calls lib/store.
 *
 * There is no login: each device generates a uuid once and stores it locally
 * (see identity()), which is why lib/schema.sql leaves row level security off.
 * Run that file in the Supabase SQL editor, then fill in lib/supabase.ts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase } from './supabase';
import { generatePrompt } from './prompts';
import type { Cadence, CreateOptions, Group, JoinOptions, Post, Profile, Reaction, Task } from './types';

type Row = Record<string, unknown>;

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const num = (v: unknown): number => (typeof v === 'number' ? v : 0);

const toGroup = (r: Row): Group => ({
  id: str(r.id),
  name: str(r.name),
  joinCode: str(r.join_code),
  goal: num(r.goal),
  level: num(r.level),
  cadence: (str(r.cadence) || 'daily') as Cadence,
  rewardText: str(r.reward_text),
  currentStreak: num(r.current_streak),
});

const toProfile = (r: Row): Profile => ({
  id: str(r.id),
  name: str(r.name),
  groupId: str(r.group_id),
  avatar: str(r.avatar) || '🙂',
  phone: str(r.phone) || undefined,
});

const toTask = (r: Row): Task => ({
  id: str(r.id),
  groupId: str(r.group_id),
  prompt: str(r.prompt),
  level: num(r.level),
});

const toPost = (r: Row): Post => ({
  id: str(r.id),
  taskId: str(r.task_id),
  groupId: str(r.group_id),
  userId: str(r.user_id),
  kind: r.kind === 'photo' ? 'photo' : 'text',
  content: str(r.content),
  createdAt: str(r.created_at),
});

const toReaction = (r: Row): Reaction => ({
  id: str(r.id),
  postId: str(r.post_id),
  userId: str(r.user_id),
  kind: r.kind === 'like' || r.kind === 'emoji' ? r.kind : 'comment',
  value: str(r.value),
});

const USER_ID_KEY = 'famstreak.userId';
const GROUP_ID_KEY = 'famstreak.groupId';

function uuid(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** This device's stable user id, created on first run. */
export async function identity(): Promise<string> {
  const saved = await AsyncStorage.getItem(USER_ID_KEY);
  if (saved) return saved;
  const id = uuid();
  await AsyncStorage.setItem(USER_ID_KEY, id);
  return id;
}

/** The family this device last joined, so a refresh keeps you in it. */
export async function savedGroupId(): Promise<string | null> {
  return AsyncStorage.getItem(GROUP_ID_KEY);
}

export async function rememberGroup(groupId: string | null): Promise<void> {
  if (groupId) await AsyncStorage.setItem(GROUP_ID_KEY, groupId);
  else await AsyncStorage.removeItem(GROUP_ID_KEY);
}

function randomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

const AVATARS = ['🙂', '👩', '👨', '🧑', '👵', '👴', '🧒', '🐣'];

export async function saveProfile(
  userId: string,
  name: string,
  groupId: string | null,
  phone?: string
): Promise<Profile> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('profiles')
    .upsert({
      id: userId,
      name,
      group_id: groupId,
      phone: phone || null,
      avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)],
    })
    .select()
    .single();
  if (error) throw error;
  return toProfile(data);
}

export async function createGroup(userId: string, opts: CreateOptions): Promise<Group> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('groups')
    .insert({
      name: `${opts.myName}'s family`,
      join_code: randomCode(),
      goal: opts.goal,
      level: 1,
      cadence: opts.cadence,
      reward_text: opts.rewardText,
    })
    .select()
    .single();
  if (error) throw error;
  const group = toGroup(data);
  await saveProfile(userId, opts.myName, group.id, opts.phone);
  await rememberGroup(group.id);
  return group;
}

export async function joinGroup(userId: string, opts: JoinOptions): Promise<Group> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('groups')
    .select()
    .eq('join_code', opts.code.trim().toUpperCase())
    .maybeSingle();
  if (error || !data) throw new Error('No family found with that code');
  const group = toGroup(data);
  await saveProfile(userId, opts.myName, group.id, opts.phone);
  await rememberGroup(group.id);
  return group;
}

export async function getGroup(groupId: string): Promise<Group | null> {
  const sb = getSupabase();
  const { data } = await sb.from('groups').select().eq('id', groupId).maybeSingle();
  return data ? toGroup(data) : null;
}

export async function getMembers(groupId: string): Promise<Profile[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('profiles')
    .select()
    .eq('group_id', groupId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(toProfile);
}

/** The task for the group's current level, created on demand. */
export async function getCurrentTask(group: Group): Promise<Task> {
  const sb = getSupabase();
  const { data } = await sb
    .from('tasks')
    .select()
    .eq('group_id', group.id)
    .eq('level', group.level)
    .maybeSingle();
  if (data) return toTask(data);

  const { data: previous } = await sb.from('tasks').select('prompt').eq('group_id', group.id);
  const recent = (previous ?? []).map((r: Row) => str(r.prompt));
  const prompt = await generatePrompt(recent.slice(-5));

  const { data: created, error } = await sb
    .from('tasks')
    .insert({ group_id: group.id, level: group.level, prompt })
    .select()
    .single();
  // Another member created it first — the unique (group_id, level) index fired.
  if (error) return getCurrentTask(group);
  return toTask(created);
}

export async function getPosts(groupId: string): Promise<Post[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('posts')
    .select()
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toPost);
}

export async function createPost(
  input: Pick<Post, 'taskId' | 'groupId' | 'userId' | 'kind' | 'content'>
): Promise<Post> {
  const sb = getSupabase();
  const content = input.kind === 'photo' ? await uploadPhoto(input.content, input.userId) : input.content;
  const { data, error } = await sb
    .from('posts')
    .insert({
      task_id: input.taskId,
      group_id: input.groupId,
      user_id: input.userId,
      kind: input.kind,
      content,
    })
    .select()
    .single();
  if (error) throw error;
  return toPost(data);
}

/** Uploads a local image uri to the public `photos` bucket, returning its url. */
async function uploadPhoto(uri: string, userId: string): Promise<string> {
  if (uri.startsWith('http')) return uri;
  const sb = getSupabase();
  const path = `${userId}/${Date.now()}.jpg`;
  const body = await (await fetch(uri)).arrayBuffer();
  const { error } = await sb.storage.from('photos').upload(path, body, { contentType: 'image/jpeg' });
  if (error) throw error;
  return sb.storage.from('photos').getPublicUrl(path).data.publicUrl;
}

export async function getReactions(groupId: string): Promise<Reaction[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('reactions')
    .select('*, posts!inner(group_id)')
    .eq('posts.group_id', groupId);
  if (error) throw error;
  return (data ?? []).map(toReaction);
}

export async function addReaction(input: Omit<Reaction, 'id'>): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from('reactions')
    .insert({ post_id: input.postId, user_id: input.userId, kind: input.kind, value: input.value });
  if (error) throw error;
}

/**
 * All-or-nothing rule: once every member has posted for the current task the
 * family levels up. The `eq('level', group.level)` guard means only the first
 * client to get there wins, so two browsers can't double-increment.
 * Returns the cleared level, or null if nothing changed.
 */
export async function clearLevelIfDone(group: Group, members: Profile[], task: Task, posts: Post[]): Promise<number | null> {
  const posted = new Set(posts.filter((p) => p.taskId === task.id).map((p) => p.userId));
  if (members.length === 0 || !members.every((m) => posted.has(m.id))) return null;

  const sb = getSupabase();
  const { data } = await sb
    .from('groups')
    .update({ level: Math.min(group.level + 1, group.goal), current_streak: group.currentStreak + 1 })
    .eq('id', group.id)
    .eq('level', group.level)
    .select()
    .maybeSingle();
  return data ? group.level : null;
}

/** Realtime: re-run `onChange` whenever anything in the family changes. */
export function subscribeToGroup(groupId: string, onChange: () => void): () => void {
  const sb = getSupabase();
  const channel = sb.channel(`family:${groupId}`);
  for (const table of ['groups', 'profiles', 'tasks', 'posts', 'reactions']) {
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, onChange);
  }
  channel.subscribe();
  return () => {
    void sb.removeChannel(channel);
  };
}
