/**
 * Person A's layer: every read/write against Supabase lives here.
 * The UI only ever calls these functions, so the two halves of the app
 * can be built in parallel without touching the same files.
 *
 * Run lib/schema.sql in the Supabase SQL editor first, then fill in
 * supabaseUrl / supabaseAnonKey in app.json.
 */
import { getSupabase } from './supabase';
import { taskPrompts } from './mockData';
import type { Cadence, Group, Post, Profile, Reaction, Task } from './types';

type Row = Record<string, any>;

const toGroup = (r: Row): Group => ({
  id: r.id,
  name: r.name,
  joinCode: r.join_code,
  goal: r.goal,
  level: r.level,
  cadence: r.cadence as Cadence,
  rewardText: r.reward_text ?? '',
  currentStreak: r.current_streak,
});

const toProfile = (r: Row): Profile => ({
  id: r.id,
  name: r.name,
  groupId: r.group_id,
  avatar: r.avatar ?? '🙂',
  phone: r.phone ?? undefined,
});

const toTask = (r: Row): Task => ({
  id: r.id,
  groupId: r.group_id,
  prompt: r.prompt,
  cycleDate: r.cycle_date,
});

const toPost = (r: Row): Post => ({
  id: r.id,
  taskId: r.task_id,
  groupId: r.group_id,
  userId: r.user_id,
  kind: r.kind,
  content: r.content,
  createdAt: r.created_at,
});

const toReaction = (r: Row): Reaction => ({
  id: r.id,
  postId: r.post_id,
  userId: r.user_id,
  kind: r.kind,
  value: r.value ?? '',
});

const today = () => new Date().toISOString().slice(0, 10);

function randomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

export async function signIn(name: string): Promise<Profile> {
  const sb = getSupabase();
  const { data, error } = await sb.auth.signInAnonymously();
  if (error) throw error;
  const id = data.user!.id;
  const { data: profile, error: upsertError } = await sb
    .from('profiles')
    .upsert({ id, name })
    .select()
    .single();
  if (upsertError) throw upsertError;
  return toProfile(profile);
}

export async function createGroup(userId: string, name: string, goal: number): Promise<Group> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('groups')
    .insert({ name, join_code: randomCode(), goal })
    .select()
    .single();
  if (error) throw error;
  await sb.from('profiles').update({ group_id: data.id }).eq('id', userId);
  return toGroup(data);
}

export async function joinGroup(userId: string, joinCode: string): Promise<Group> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('groups')
    .select()
    .eq('join_code', joinCode.toUpperCase())
    .single();
  if (error) throw new Error('No family found with that code');
  await sb.from('profiles').update({ group_id: data.id }).eq('id', userId);
  return toGroup(data);
}

export async function getGroup(groupId: string): Promise<Group> {
  const sb = getSupabase();
  const { data, error } = await sb.from('groups').select().eq('id', groupId).single();
  if (error) throw error;
  return toGroup(data);
}

export async function getMembers(groupId: string): Promise<Profile[]> {
  const sb = getSupabase();
  const { data, error } = await sb.from('profiles').select().eq('group_id', groupId);
  if (error) throw error;
  return (data ?? []).map(toProfile);
}

/** Returns the current cycle's task, creating one from the rotating prompt list if needed. */
export async function getCurrentTask(groupId: string): Promise<Task> {
  const sb = getSupabase();
  const { data } = await sb
    .from('tasks')
    .select()
    .eq('group_id', groupId)
    .eq('cycle_date', today())
    .maybeSingle();
  if (data) return toTask(data);

  const { count } = await sb
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', groupId);
  const prompt = taskPrompts[(count ?? 0) % taskPrompts.length];
  const { data: created, error } = await sb
    .from('tasks')
    .insert({ group_id: groupId, prompt, cycle_date: today() })
    .select()
    .single();
  if (error) throw error;
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
  const { data, error } = await sb
    .from('posts')
    .insert({
      task_id: input.taskId,
      group_id: input.groupId,
      user_id: input.userId,
      kind: input.kind,
      content: input.content,
    })
    .select()
    .single();
  if (error) throw error;
  return toPost(data);
}

/** Uploads a local image uri to the `photos` bucket and returns its public url. */
export async function uploadPhoto(uri: string, userId: string): Promise<string> {
  const sb = getSupabase();
  const path = `${userId}/${Date.now()}.jpg`;
  const body = await (await fetch(uri)).arrayBuffer();
  const { error } = await sb.storage.from('photos').upload(path, body, { contentType: 'image/jpeg' });
  if (error) throw error;
  return sb.storage.from('photos').getPublicUrl(path).data.publicUrl;
}

export async function getReactions(groupId: string): Promise<Reaction[]> {
  const sb = getSupabase();
  const { data, error } = await sb.from('reactions').select('*, posts!inner(group_id)').eq('posts.group_id', groupId);
  if (error) throw error;
  return (data ?? []).map(toReaction);
}

export async function addReaction(input: Omit<Reaction, 'id'>): Promise<Reaction> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('reactions')
    .insert({ post_id: input.postId, user_id: input.userId, kind: input.kind, value: input.value })
    .select()
    .single();
  if (error) throw error;
  return toReaction(data);
}

/**
 * All-or-nothing streak rule: if every member posted for the current task the
 * group levels up, otherwise the streak resets to zero. Call on app open.
 */
export async function evaluateCycle(groupId: string): Promise<Group> {
  const sb = getSupabase();
  const group = await getGroup(groupId);
  const members = await getMembers(groupId);
  const task = await getCurrentTask(groupId);
  const { data: posts } = await sb.from('posts').select('user_id').eq('task_id', task.id);
  const posted = new Set((posts ?? []).map((p: Row) => p.user_id));
  const everyone = members.length > 0 && members.every((m) => posted.has(m.id));

  const next = everyone
    ? { level: group.level + 1, current_streak: group.currentStreak + 1 }
    : { level: group.level, current_streak: 0 };
  const { data, error } = await sb.from('groups').update(next).eq('id', groupId).select().single();
  if (error) throw error;
  return toGroup(data);
}

/** Realtime: re-run `onChange` whenever the group's posts change. */
export function subscribeToPosts(groupId: string, onChange: () => void) {
  const sb = getSupabase();
  const channel = sb
    .channel(`posts:${groupId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts', filter: `group_id=eq.${groupId}` }, onChange)
    .subscribe();
  return () => {
    void sb.removeChannel(channel);
  };
}
