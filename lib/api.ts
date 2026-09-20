/**
 * Every read/write against Supabase lives here; the UI only calls lib/store.
 *
 * There is no login: each device generates a uuid once and stores it locally
 * (see identity()), which is why lib/schema.sql leaves row level security off.
 * Run that file in the Supabase SQL editor, then fill in lib/supabase.ts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { levelUnlocksAt, postsForTask } from './levels';
import { getSupabase, supabaseAnonKey, supabaseUrl } from './supabase';
import { familyContext, generatePrompt, type FamilyContext } from './prompts';
import { sendExpoPush } from './push';
import { nudgeContent } from './nudge';
import type { Cadence, CreateOptions, Group, JoinOptions, Post, Profile, Reaction, Task } from './types';

type Row = Record<string, unknown>;

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const num = (v: unknown): number => (typeof v === 'number' ? v : 0);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

const toGroup = (r: Row): Group => ({
  id: str(r.id),
  name: str(r.name),
  joinCode: str(r.join_code),
  goal: num(r.goal),
  level: num(r.level),
  cadence: (str(r.cadence) || 'daily') as Cadence,
  rewardText: str(r.reward_text),
  currentStreak: num(r.current_streak),
  awaitingNextGoal: Boolean(r.awaiting_next_goal),
  pendingCadence: (str(r.pending_cadence) || undefined) as Cadence | undefined,
  cadenceApprovals: strs(r.cadence_approvals),
});

const toProfile = (r: Row): Profile => ({
  id: str(r.id),
  name: str(r.name),
  groupId: str(r.group_id),
  avatar: str(r.avatar) || '🙂',
  phone: str(r.phone) || undefined,
  expoPushToken: str(r.expo_push_token) || undefined,
});

const toTask = (r: Row): Task => ({
  id: str(r.id),
  groupId: str(r.group_id),
  prompt: str(r.prompt),
  level: num(r.level),
  cycleDate: str(r.cycle_date) || undefined,
  createdAt: str(r.created_at) || undefined,
});

const toPost = (r: Row): Post => ({
  id: str(r.id),
  taskId: str(r.task_id),
  groupId: str(r.group_id),
  userId: str(r.user_id),
  kind: r.kind === 'photo' || r.kind === 'voice' ? r.kind : 'text',
  content: str(r.content),
  caption: str(r.caption) || undefined,
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
const AVATAR_KEY = 'famstreak.avatar';

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

/** The face drawn on /avatar, kept until there is a profile row to put it on. */
export async function savePendingAvatar(avatar: string): Promise<void> {
  await AsyncStorage.setItem(AVATAR_KEY, avatar);
}

export async function pendingAvatar(): Promise<string | null> {
  return AsyncStorage.getItem(AVATAR_KEY);
}

export async function saveProfile(
  userId: string,
  name: string,
  groupId: string | null,
  phone?: string
): Promise<Profile> {
  const sb = getSupabase();
  const drawn = await pendingAvatar();
  const { data, error } = await sb
    .from('profiles')
    .upsert({
      id: userId,
      name,
      group_id: groupId,
      phone: phone || null,
      avatar: drawn || AVATARS[Math.floor(Math.random() * AVATARS.length)],
    })
    .select()
    .single();
  if (error) throw error;
  return toProfile(data);
}

/** Membership survives joining another family, unlike `profiles.group_id`. */
async function rememberMembership(groupId: string, userId: string): Promise<void> {
  const sb = getSupabase();
  await sb.from('memberships').upsert({ group_id: groupId, user_id: userId });
}

async function forgetMembership(groupId: string, userId: string): Promise<void> {
  const sb = getSupabase();
  await sb.from('memberships').delete().eq('group_id', groupId).eq('user_id', userId);
}

export async function savePushToken(userId: string, token: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from('profiles').update({ expo_push_token: token }).eq('id', userId);
  if (error) return;
}

async function notifyProfile(
  profile: Profile | undefined,
  title: string,
  body: string,
  data: Record<string, string>
) {
  if (!profile?.expoPushToken) return;
  await sendExpoPush(profile.expoPushToken, title, body, data);
}

export async function remindToPost(from: Profile, to: Profile, prompt: string): Promise<void> {
  if (from.id === to.id) return;
  await notifyProfile(to, `${from.name} is waiting 👀`, prompt, { type: 'capture' });
  const sb = getSupabase();
  const row = {
    task_id: null,
    group_id: from.groupId,
    user_id: from.id,
    kind: 'text',
    content: nudgeContent(to.id),
    caption: prompt,
  };
  const inserted = await sb.from('posts').insert(row).select().single();
  if (inserted.error) {
    const { caption: _caption, ...withoutCaption } = row;
    await sb.from('posts').insert(withoutCaption);
  }
}

export async function deletePost(id: string): Promise<void> {
  const sb = getSupabase();
  await sb.from('posts').delete().eq('id', id);
}

export async function createGroup(userId: string, opts: CreateOptions): Promise<Group> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('groups')
    .insert({
      name: opts.familyName?.trim() || `${opts.myName}'s family`,
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
  await rememberMembership(group.id, userId);
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
  await rememberMembership(group.id, userId);
  await rememberGroup(group.id);
  return group;
}

export async function leaveGroup(groupId: string, userId: string): Promise<void> {
  await forgetMembership(groupId, userId);
}

/**
 * Settings screen: name, reward and level goal can change any time. Cadence
 * cannot — it goes through proposeCadence/approveCadence instead.
 */
export async function updateGroup(
  groupId: string,
  patch: { rewardText: string; goal: number; name?: string }
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from('groups')
    .update({
      reward_text: patch.rewardText,
      goal: patch.goal,
      ...(patch.name ? { name: patch.name } : {}),
    })
    .eq('id', groupId);
  if (error) throw error;
}

/**
 * Reminder frequency is a family decision: proposing one starts a vote that the
 * proposer has already cast. In a family of one it applies immediately.
 */
export async function proposeCadence(
  group: Group,
  members: Profile[],
  userId: string,
  cadence: Cadence
): Promise<void> {
  if (cadence === group.cadence) return cancelCadenceChange(group.id);
  await recordCadenceVote(group.id, cadence, [userId], members);
}

export async function approveCadence(
  group: Group,
  members: Profile[],
  userId: string
): Promise<void> {
  if (!group.pendingCadence || group.cadenceApprovals.includes(userId)) return;
  await recordCadenceVote(
    group.id,
    group.pendingCadence,
    [...group.cadenceApprovals, userId],
    members
  );
}

export async function cancelCadenceChange(groupId: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from('groups')
    .update({ pending_cadence: null, cadence_approvals: [] })
    .eq('id', groupId);
  if (error) throw error;
}

/** Writes the tally, or applies the cadence once every member is in it. */
async function recordCadenceVote(
  groupId: string,
  cadence: Cadence,
  approvals: string[],
  members: Profile[]
): Promise<void> {
  const everyone = members.length > 0 && members.every((m) => approvals.includes(m.id));
  const sb = getSupabase();
  const { error } = await sb
    .from('groups')
    .update(
      everyone
        ? { cadence, pending_cadence: null, cadence_approvals: [] }
        : { pending_cadence: cadence, cadence_approvals: approvals }
    )
    .eq('id', groupId);
  if (!error) return;

  // Databases created before the vote columns existed can still change the
  // frequency outright, which is all a family of one ever needs.
  if (everyone) {
    const retry = await sb.from('groups').update({ cadence }).eq('id', groupId);
    if (!retry.error) return;
  }
  throw error;
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
  const members = (data ?? []).map(toProfile);

  // Anyone who joined another family later kept their membership but not their
  // profile's group_id, so pick them up from the roster too. A family with no
  // roster at all predates the memberships table, so fall back to who posted —
  // once a roster exists it is authoritative and leaving really removes you.
  const joined = await sb.from('memberships').select('user_id').eq('group_id', groupId);
  const roster = joined.error ? [] : (joined.data ?? []);
  const legacy =
    roster.length === 0
      ? await sb.from('posts').select('user_id').eq('group_id', groupId)
      : null;
  const seen = [...roster, ...(legacy && !legacy.error ? (legacy.data ?? []) : [])].map((r) =>
    str(r.user_id)
  );
  const missing = [...new Set(seen)].filter((id) => id && !members.some((m) => m.id === id));
  if (missing.length === 0) return members;

  const past = await sb.from('profiles').select().in('id', missing);
  if (past.error) return members;
  return [...members, ...(past.data ?? []).map(toProfile)].map((m) => ({ ...m, groupId }));
}

/**
 * People who posted here but are no longer in the family, so their old posts
 * still carry their name without them counting toward a level.
 */
export async function getPastAuthors(groupId: string, members: Profile[]): Promise<Profile[]> {
  const sb = getSupabase();
  const posted = await sb.from('posts').select('user_id').eq('group_id', groupId);
  if (posted.error) return [];
  const ids = [...new Set((posted.data ?? []).map((r) => str(r.user_id)))].filter(
    (id) => id && !members.some((m) => m.id === id)
  );
  if (ids.length === 0) return [];

  const past = await sb.from('profiles').select().in('id', ids);
  if (past.error) return [];
  return (past.data ?? []).map(toProfile).map((m) => ({ ...m, groupId }));
}

/**
 * What the family has been sharing lately, so the next prompt can follow on
 * from it rather than being generic. Photos come through as their caption
 * only — the image itself is a data URL nobody can read.
 */
async function contextFor(group: Group): Promise<FamilyContext> {
  const sb = getSupabase();
  const [members, posts] = await Promise.all([
    getMembers(group.id).catch(() => [] as Profile[]),
    sb
      .from('posts')
      .select()
      .eq('group_id', group.id)
      .order('created_at', { ascending: false })
      .limit(12),
  ]);

  return familyContext(group.name, members, (posts.data ?? []).map(toPost));
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
  const prompt = await generatePrompt(recent.slice(-5), await contextFor(group));

  const { data: created, error } = await sb
    .from('tasks')
    .insert({ group_id: group.id, level: group.level, prompt })
    .select()
    .single();
  // Another member created it first — the unique (group_id, level) index fired.
  if (error) return getCurrentTask(group);
  return toTask(created);
}

/**
 * Demo: play out a missed period. The family drops to level 1 with no streak
 * and level 1 is re-issued with a new prompt, so the restart is a fresh round
 * rather than the one they already finished.
 */
/**
 * The database's clock, since post timestamps are written by it. A device
 * running fast would otherwise re-issue a task "in the future" and refuse the
 * answers posted right after it.
 */
async function serverNow(): Promise<string> {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: { apikey: supabaseAnonKey },
    });
    const stamp = res.headers.get('date');
    if (stamp) return new Date(stamp).toISOString();
  } catch {
    // Offline or a proxy that strips the header: the device clock will do.
  }
  return new Date().toISOString();
}

export async function resetForMissedPeriod(group: Group): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from('groups')
    .update({ level: 1, current_streak: 0 })
    .eq('id', group.id);
  if (error) throw error;

  const { data: previous } = await sb.from('tasks').select('prompt').eq('group_id', group.id);
  const recent = (previous ?? []).map((r: Row) => str(r.prompt));
  const prompt = await generatePrompt(recent.slice(-5), await contextFor(group));
  await sb
    .from('tasks')
    .update({ prompt, created_at: await serverNow() })
    .eq('group_id', group.id)
    .eq('level', 1);
}

export async function getTasks(groupId: string): Promise<Task[]> {
  const sb = getSupabase();
  const { data, error } = await sb.from('tasks').select().eq('group_id', groupId);
  if (error) throw error;
  return (data ?? []).map(toTask);
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

/** A null taskId is a hangout post: it counts for nothing, it's just chat. */
export async function createPost(
  input: Pick<Post, 'groupId' | 'userId' | 'kind' | 'content' | 'caption'> & {
    taskId: string | null;
  }
): Promise<Post> {
  const sb = getSupabase();
  const content =
    input.kind === 'text' ? input.content : await uploadMedia(input.kind, input.content, input.userId);
  const row: Record<string, unknown> = {
    task_id: input.taskId,
    group_id: input.groupId,
    user_id: input.userId,
    kind: input.kind,
    content,
  };
  const insert = (withCaption: boolean) =>
    sb
      .from('posts')
      .insert(withCaption ? { ...row, caption: input.caption || null } : row)
      .select()
      .single();

  // Databases created before captions existed have no caption column; the post
  // still matters more than the words under it.
  let { data, error } = await insert(true);
  if (error) ({ data, error } = await insert(false));
  if (error) throw error;
  const post = toPost(data);
  const members = await getMembers(input.groupId);
  const actor = members.find((m) => m.id === input.userId);
  await Promise.all(
    members
      .filter((m) => m.id !== input.userId)
      .map((m) =>
        notifyProfile(m, `${actor?.name ?? 'Family'} posted`, 'Open to react — like, comment, or call.', {
          type: 'post',
          postId: post.id,
        })
      )
  );
  return post;
}

/**
 * Uploads a local photo or recording to the public `photos` bucket, returning
 * its url. Recordings share the bucket so no new one has to be created; they
 * keep the extension the recorder gave them (m4a on a phone, webm on the web).
 */
async function uploadMedia(kind: 'photo' | 'voice', uri: string, userId: string): Promise<string> {
  if (uri.startsWith('http')) return uri;
  const sb = getSupabase();
  const blob = await (await fetch(uri)).blob();
  const type = kind === 'photo' ? 'image/jpeg' : blob.type || 'audio/m4a';
  const extension = kind === 'photo' ? 'jpg' : (type.split('/')[1]?.split(';')[0] ?? 'm4a');
  const path = `${userId}/${Date.now()}.${extension}`;
  const { error } = await sb.storage.from('photos').upload(path, blob, { contentType: type });
  if (error) throw error;
  return sb.storage.from('photos').getPublicUrl(path).data.publicUrl;
}

export async function getReactions(groupId: string): Promise<Reaction[]> {
  const sb = getSupabase();
  const nested = await sb
    .from('reactions')
    .select('*, posts!inner(group_id)')
    .eq('posts.group_id', groupId);
  if (!nested.error) return (nested.data ?? []).map(toReaction);

  const posts = await getPosts(groupId);
  const ids = posts.map((p) => p.id);
  if (ids.length === 0) return [];
  const { data, error } = await sb.from('reactions').select().in('post_id', ids);
  if (error) throw error;
  return (data ?? []).map(toReaction);
}

export async function removeReaction(
  postId: string,
  userId: string,
  kind: Reaction['kind'],
  value?: string
): Promise<void> {
  const sb = getSupabase();
  let query = sb
    .from('reactions')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId)
    .eq('kind', kind);
  if (value !== undefined) query = query.eq('value', value);
  const { error } = await query;
  if (error) throw error;
}

export async function addReaction(input: Omit<Reaction, 'id'>): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from('reactions')
    .insert({ post_id: input.postId, user_id: input.userId, kind: input.kind, value: input.value });
  if (error) throw error;

  const { data: postRow } = await sb.from('posts').select().eq('id', input.postId).maybeSingle();
  if (!postRow) return;
  const authorId = str(postRow.user_id);
  if (!authorId || authorId === input.userId) return;
  const [author, actor] = await Promise.all([
    sb.from('profiles').select().eq('id', authorId).maybeSingle(),
    sb.from('profiles').select().eq('id', input.userId).maybeSingle(),
  ]);
  const actorName = actor.data ? toProfile(actor.data as Row).name : 'Family';
  const title =
    input.kind === 'comment'
      ? `${actorName} commented`
      : input.kind === 'like'
        ? `${actorName} liked your post`
        : `${actorName} reacted ${input.value}`;
  const body = input.kind === 'comment' ? input.value : 'Open FamStreak to see their reaction.';
  await notifyProfile(author.data ? toProfile(author.data as Row) : undefined, title, body, {
    type: 'post',
    postId: input.postId,
  });
}

/**
 * All-or-nothing rule: once every member has posted for the current task AND
 * the level's period has run out at midnight, the family levels up. The
 * `eq('level', group.level)` guard means only the first client to get there
 * wins, so two browsers can't double-increment.
 * Returns the cleared level, or null if nothing changed.
 */
export async function clearLevelIfDone(
  group: Group,
  members: Profile[],
  task: Task,
  posts: Post[],
  ignoreWait = false
): Promise<number | null> {
  const posted = new Set(postsForTask(posts, task).map((p) => p.userId));
  if (members.length === 0 || !members.every((m) => posted.has(m.id))) return null;
  if (!ignoreWait && Date.now() < levelUnlocksAt(task.createdAt, group.cadence, task.level))
    return null;

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
