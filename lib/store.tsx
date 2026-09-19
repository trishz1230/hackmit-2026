/**
 * App state. Two implementations behind one hook:
 *
 *   Supabase configured -> LiveProvider: real shared families, realtime feed,
 *                          everyone on the same deployment sees each other.
 *   not configured      -> MockProvider: solo demo with scripted relatives,
 *                          so the app still runs with zero setup.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as api from './api';
import { clampLevelCount, levelOpensAt, levelUnlocksAt, todayKey } from './levels';
import { familyReplies, mockGroup, mockPosts, mockProfiles, mockReactions, mockTask, taskPrompts } from './mockData';
import { generatePrompt } from './prompts';
import { getPushToken, sendExpoPush } from './push';
import { isSupabaseConfigured } from './supabase';
import type { Cadence, CreateOptions, Group, JoinOptions, Post, Profile, Reaction, Task } from './types';

/** Task posts clear levels; hangout posts are just for fun. */
export type Channel = 'task' | 'hangout';

const CURRENT_USER_ID = 'user-1';

/** Mock family with the person at this browser renamed. */
const withMe = (myName: string, phone?: string): Profile[] =>
  mockProfiles.map((p) =>
    p.id === CURRENT_USER_ID ? { ...p, name: myName, phone: phone ?? p.phone } : p
  );
/** How long each simulated family member takes to answer the task (mock only). */
const REPLY_DELAY_MS = 2500;

type State = {
  group: Group | null;
  members: Profile[];
  me: Profile;
  task: Task;
  /** Every task this family has had, so cleared levels and the feed still show the prompt. */
  tasks: Task[];
  promptFor: (taskId: string) => string | undefined;
  taskForLevel: (level: number) => Task | undefined;
  myPostForLevel: (level: number) => Post | undefined;
  /** Answers to the current level's task. */
  posts: Post[];
  /** Free posts that don't count toward the level. */
  hangoutPosts: Post[];
  reactions: Reaction[];
  hasPostedThisCycle: boolean;
  everyonePostedThisCycle: boolean;
  /** Everyone answered, but the level's period hasn't run out yet. */
  waitingForPeriod: boolean;
  /** Epoch ms when the current level's period ends (local midnight). */
  unlocksAt: number;
  /** Epoch ms when the current level's task becomes readable. */
  opensAt: number;
  /** The next conversation hasn't started yet, so the prompt stays hidden. */
  taskLocked: boolean;
  /** Demo escape hatch: true while the period is being treated as over. */
  periodWaived: boolean;
  /** Turns the period-end escape hatch on or off. */
  setPeriodWaived: (on: boolean) => void;
  missedReset: boolean;
  dismissMissedReset: () => void;
  unseenPosts: Post[];
  unseenReactions: ReactionNag[];
  /** Members who still owe a post for the current task. */
  pending: Profile[];
  /** Ping someone who hasn't posted this cycle. */
  remindToPost: (memberId: string) => void;
  /** Level just cleared, for the celebration overlay; null once dismissed. */
  clearedLevel: number | null;
  /** True once every member is real rather than scripted. */
  isLive: boolean;
  /** True while the saved family is still being fetched on boot. */
  loading: boolean;
  /** Last thing the backend refused to do, for the onboarding screen. */
  error: string | null;
  dismissCelebration: () => void;
  createGroup: (opts: CreateOptions) => void;
  joinGroup: (opts: JoinOptions) => void;
  updateSettings: (patch: { rewardText: string; goal: number; name?: string }) => void;
  /** Members who still have to approve the pending cadence change. */
  cadencePendingOn: Profile[];
  proposeCadence: (cadence: Cadence) => void;
  approveCadence: () => void;
  cancelCadenceChange: () => void;
  addPost: (
    kind: Post['kind'],
    content: string,
    channel?: Channel,
    caption?: string
  ) => { completedGoal: boolean };
  addReaction: (postId: string, kind: Reaction['kind'], value: string) => void;
  /** Likes are one per member: liking again takes it back. */
  toggleLike: (postId: string) => void;
  likedByMe: (postId: string) => boolean;
  reactionsFor: (postId: string) => Reaction[];
  memberById: (id: string) => Profile | undefined;
  updateProfile: (input: { name: string; phone?: string }) => void;
  leaveGroup: () => void;
  startNextGoal: (reward: string, levelCount: number) => void;
  simulateMissedDay: () => void;
  markPostSeen: (postId: string) => void;
  restart: () => void;
};

const AppContext = createContext<State | null>(null);

const emptyMe = (userId: string, groupId = ''): Profile => ({
  id: userId,
  name: 'You',
  groupId,
  avatar: '🙂',
});

export type ReactionNag = {
  id: string;
  postId: string;
  actorName: string;
  authorName: string;
  kind: Reaction['kind'];
  value: string;
  /** This device authored the post — only that phone is nagged. */
  forMe: boolean;
};

function unseenReactionNags(
  reactions: Reaction[],
  allPosts: Post[],
  members: Profile[],
  meId: string,
  seenReactionIds: string[]
): ReactionNag[] {
  const nags: ReactionNag[] = [];
  for (const reaction of reactions) {
    if (seenReactionIds.includes(reaction.id)) continue;
    const post = allPosts.find((p) => p.id === reaction.postId);
    if (!post || reaction.userId === post.userId) continue;
    const forMe = post.userId === meId && reaction.userId !== meId;
    if (!forMe) continue;
    nags.push({
      id: reaction.id,
      postId: post.id,
      actorName: members.find((m) => m.id === reaction.userId)?.name ?? 'Family',
      authorName: members.find((m) => m.id === post.userId)?.name ?? 'Family',
      kind: reaction.kind,
      value: reaction.value,
      forMe,
    });
  }
  return nags;
}

const promptForTasks = (tasks: Task[], taskId: string) => tasks.find((t) => t.id === taskId)?.prompt;

const latestTaskForLevel = (tasks: Task[], level: number) =>
  [...tasks].reverse().find((t) => t.level === level);

/** Keep the same array when nothing new was seen so we don't retrigger effects. */
function mergeSeenIds(prev: string[], extra: string[]) {
  const next = extra.filter((id) => !prev.includes(id));
  return next.length === 0 ? prev : [...prev, ...next];
}

/** Supabase rejects with plain objects, which stringify to [object Object]. */
function describeError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return String(e);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  return isSupabaseConfigured ? (
    <LiveProvider>{children}</LiveProvider>
  ) : (
    <MockProvider>{children}</MockProvider>
  );
}

/* ------------------------------------------------------------------ live */

function LiveProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string>('');
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [task, setTask] = useState<Task>(mockTask);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [clearedLevel, setClearedLevel] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [seenPostIds, setSeenPostIds] = useState<string[]>([]);
  const [seenReactionIds, setSeenReactionIds] = useState<string[]>([]);
  const [missedReset, setMissedReset] = useState(false);
  /** Last level this browser saw, so every member gets the celebration. */
  const lastLevel = useRef<number | null>(null);
  /** The family on screen, so a late reply for an old one can't overwrite it. */
  const activeId = useRef<string | null>(null);
  /** Set by the demo button to clear the level without waiting for midnight. */
  const waived = useRef(false);
  const [periodWaived, setPeriodWaivedState] = useState(false);
  const setPeriodWaived = useCallback((on: boolean) => {
    waived.current = on;
    setPeriodWaivedState(on);
  }, []);

  /** Fire-and-forget a backend call, surfacing whatever it refuses to do. */
  const run = useCallback((fn: () => Promise<void>) => {
    void fn().then(
      () => setError(null),
      (e: unknown) => setError(describeError(e))
    );
  }, []);

  /** Pulls the whole family in one go, then clears the level if everyone posted. */
  const refresh = useCallback(async (groupId: string, becomeActive = false) => {
    if (becomeActive) {
      activeId.current = groupId;
      lastLevel.current = null;
      setPosts([]);
      setReactions([]);
      setMembers([]);
      setClearedLevel(null);
    }
    const stale = () => activeId.current !== null && activeId.current !== groupId;
    const current = await api.getGroup(groupId);
    if (stale()) return;
    if (!current) {
      await api.rememberGroup(null);
      setGroup(null);
      lastLevel.current = null;
      return;
    }
    const [nextMembers, nextTask, nextTasks, nextPosts, nextReactions] = await Promise.all([
      api.getMembers(groupId),
      api.getCurrentTask(current),
      api.getTasks(groupId),
      api.getPosts(groupId),
      api.getReactions(groupId),
    ]);
    if (stale()) return;
    setGroup(current);
    setMembers(nextMembers);
    setTask(nextTask);
    setTasks(nextTasks.some((t) => t.id === nextTask.id) ? nextTasks : [...nextTasks, nextTask]);
    setPosts(nextPosts);
    setReactions(nextReactions);

    if (lastLevel.current !== null && current.level > lastLevel.current) {
      setClearedLevel(current.level - 1);
      waived.current = false;
      setPeriodWaivedState(false);
    }
    lastLevel.current = current.level;

    await api.clearLevelIfDone(current, nextMembers, nextTask, nextPosts, waived.current);
  }, []);

  useEffect(() => {
    void (async () => {
      setUserId(await api.identity());
      const saved = await api.savedGroupId();
      if (saved) await refresh(saved, true);
      setLoading(false);
    })();
  }, [refresh]);

  useEffect(() => {
    if (!userId || !group) return;
    void (async () => {
      const token = await getPushToken();
      if (token) await api.savePushToken(userId, token);
    })();
  }, [userId, group?.id]);

  useEffect(() => {
    if (!group) return;
    const groupId = group.id;
    return api.subscribeToGroup(groupId, () => void refresh(groupId));
  }, [group?.id, refresh]);

  const me = members.find((m) => m.id === userId) ?? emptyMe(userId, group?.id ?? '');
  const postedIds = posts.filter((p) => p.taskId === task.id).map((p) => p.userId);
  const hasPostedThisCycle = postedIds.includes(userId);
  const pending = members.filter((m) => !postedIds.includes(m.id));
  const everyonePostedThisCycle =
    members.length > 0 && members.every((m) => postedIds.includes(m.id));
  const taskPosts = posts.filter((p) => p.taskId !== '');
  const hangoutPosts = posts.filter((p) => p.taskId === '');
  const unseenPosts = posts.filter(
    (p) => p.userId !== me.id && !seenPostIds.includes(p.id) && !p.id.startsWith('stub-')
  );
  const unseenReactions = unseenReactionNags(
    reactions,
    [...taskPosts, ...hangoutPosts],
    members,
    me.id,
    seenReactionIds
  );
  const unlocksAt = levelUnlocksAt(task.createdAt, group?.cadence ?? 'daily', task.level);
  const opensAt = levelOpensAt(task.createdAt, task.level);
  const taskLocked = !waived.current && Date.now() < opensAt;
  const waitingForPeriod = !taskLocked && everyonePostedThisCycle && Date.now() < unlocksAt;
  const cadencePendingOn = group?.pendingCadence
    ? members.filter((m) => !group.cadenceApprovals.includes(m.id))
    : [];

  // Nothing pushes an event when midnight arrives, so poll while we're waiting.
  useEffect(() => {
    if (!group || (!waitingForPeriod && !taskLocked)) return;
    const groupId = group.id;
    const target = taskLocked ? opensAt : unlocksAt;
    const timer = setTimeout(
      () => void refresh(groupId),
      Math.min(Math.max(target - Date.now(), 1000), 60_000)
    );
    return () => clearTimeout(timer);
  }, [group?.id, waitingForPeriod, taskLocked, opensAt, unlocksAt, refresh]);

  const value = useMemo<State>(
    () => ({
      group,
      members,
      me,
      task,
      tasks,
      promptFor: (taskId) => promptForTasks(tasks, taskId),
      taskForLevel: (level) => latestTaskForLevel(tasks, level),
      myPostForLevel: (level) => {
        const remembered = latestTaskForLevel(tasks, level);
        if (!remembered) return undefined;
        return taskPosts.find((p) => p.taskId === remembered.id && p.userId === me.id);
      },
      posts: taskPosts,
      hangoutPosts,
      reactions,
      hasPostedThisCycle,
      everyonePostedThisCycle,
      waitingForPeriod,
      unlocksAt,
      opensAt,
      taskLocked,
      periodWaived,
      setPeriodWaived: (on) => {
        setPeriodWaived(on);
        if (on && group) run(() => refresh(group.id));
      },
      missedReset,
      dismissMissedReset: () => setMissedReset(false),
      unseenPosts,
      unseenReactions,
      pending,
      remindToPost: (memberId) => {
        const target = members.find((m) => m.id === memberId);
        if (!target || target.id === me.id) return;
        void api.remindToPost(me, target, task.prompt);
      },
      clearedLevel,
      isLive: true,
      loading,
      error,
      dismissCelebration: () => setClearedLevel(null),
      createGroup: (opts) => {
        run(async () => {
          const created = await api.createGroup(userId, opts);
          await refresh(created.id, true);
        });
      },
      joinGroup: (opts) => {
        run(async () => {
          const joined = await api.joinGroup(userId, opts);
          await refresh(joined.id, true);
        });
      },
      updateSettings: (patch) => {
        if (!group) return;
        run(async () => {
          await api.updateGroup(group.id, patch);
          await refresh(group.id);
        });
      },
      cadencePendingOn,
      proposeCadence: (cadence) => {
        if (!group) return;
        run(async () => {
          await api.proposeCadence(group, members, userId, cadence);
          await refresh(group.id);
        });
      },
      approveCadence: () => {
        if (!group) return;
        run(async () => {
          await api.approveCadence(group, members, userId);
          await refresh(group.id);
        });
      },
      cancelCadenceChange: () => {
        if (!group) return;
        run(async () => {
          await api.cancelCadenceChange(group.id);
          await refresh(group.id);
        });
      },
      addPost: (kind, content, channel = 'task', caption) => {
        if (!group) return { completedGoal: false };
        run(async () => {
          await api.createPost({
            taskId: channel === 'hangout' ? null : task.id,
            groupId: group.id,
            userId,
            kind,
            content,
            caption,
          });
          await refresh(group.id);
        });
        return { completedGoal: false };
      },
      addReaction: (postId, kind, val) => {
        if (!group) return;
        run(async () => {
          await api.addReaction({ postId, userId, kind, value: val });
          await refresh(group.id);
        });
      },
      toggleLike: (postId) => {
        if (!group) return;
        const mine = reactions.some(
          (r) => r.postId === postId && r.kind === 'like' && r.userId === userId
        );
        run(async () => {
          if (mine) await api.removeReaction(postId, userId, 'like');
          else await api.addReaction({ postId, userId, kind: 'like', value: '1' });
          await refresh(group.id);
        });
      },
      likedByMe: (postId) =>
        reactions.some((r) => r.postId === postId && r.kind === 'like' && r.userId === userId),
      reactionsFor: (postId) => reactions.filter((r) => r.postId === postId),
      memberById: (id) => members.find((m) => m.id === id),
      updateProfile: ({ name, phone }) => {
        run(async () => {
          await api.saveProfile(userId, name.trim() || me.name, group?.id ?? null, phone);
          if (group) await refresh(group.id);
        });
      },
      leaveGroup: () => {
        run(async () => {
          await api.saveProfile(userId, me.name, null);
          await api.rememberGroup(null);
          lastLevel.current = null;
          activeId.current = null;
          setGroup(null);
          setMembers([]);
          setPosts([]);
          setReactions([]);
          setClearedLevel(null);
        });
      },
      startNextGoal: (reward, levelCount) => {
        if (!group) return;
        run(async () => {
          await api.updateGroup(group.id, {
            rewardText: reward.trim(),
            goal: clampLevelCount(levelCount),
          });
          await refresh(group.id);
        });
      },
      simulateMissedDay: () => setMissedReset((prev) => !prev),
      markPostSeen: (postId) => {
        setSeenPostIds((prev) => (prev.includes(postId) ? prev : [...prev, postId]));
        setSeenReactionIds((prev) =>
          mergeSeenIds(
            prev,
            reactions.filter((r) => r.postId === postId).map((r) => r.id)
          )
        );
      },
      restart: () => {
        run(async () => {
          await api.saveProfile(userId, me.name, null);
          await api.rememberGroup(null);
          lastLevel.current = null;
          activeId.current = null;
          setGroup(null);
          setMembers([]);
          setPosts([]);
          setReactions([]);
          setClearedLevel(null);
        });
      },
    }),
    [
      group,
      members,
      me,
      task,
      taskPosts,
      hangoutPosts,
      reactions,
      hasPostedThisCycle,
      everyonePostedThisCycle,
      waitingForPeriod,
      unlocksAt,
      opensAt,
      taskLocked,
      periodWaived,
      setPeriodWaived,
      cadencePendingOn,
      missedReset,
      unseenPosts,
      unseenReactions,
      pending,
      clearedLevel,
      loading,
      error,
      run,
      userId,
      refresh,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/* ------------------------------------------------------------------ mock */

const newTask = (prompt: string, level: number): Task => ({
  id: `task-${Date.now()}`,
  groupId: mockGroup.id,
  prompt,
  level,
  cycleDate: todayKey(),
  createdAt: new Date().toISOString(),
});

function MockProvider({ children }: { children: React.ReactNode }) {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Profile[]>(mockProfiles);
  const [task, setTask] = useState<Task>(mockTask);
  const [tasks, setTasks] = useState<Task[]>([mockTask]);
  const [posts, setPosts] = useState<Post[]>(mockPosts);
  const [reactions, setReactions] = useState<Reaction[]>(mockReactions);
  const [clearedLevel, setClearedLevel] = useState<number | null>(null);
  const [missedReset, setMissedReset] = useState(false);
  const [seenPostIds, setSeenPostIds] = useState<string[]>([]);
  const [seenReactionIds, setSeenReactionIds] = useState<string[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const seenPrompts = useRef<string[]>([mockTask.prompt]);
  const [waived, setWaived] = useState(false);
  const missChecked = useRef<string | null>(null);

  const rememberTask = useCallback((next: Task, resetHistory = false) => {
    setTask(next);
    setTasks((prev) => (resetHistory ? [next] : [...prev.filter((t) => t.id !== next.id), next]));
  }, []);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const me = members.find((m) => m.id === CURRENT_USER_ID) ?? mockProfiles[0];
  const cyclePosts = posts.filter((p) => p.taskId === task.id);
  const postedIds = cyclePosts.map((p) => p.userId);
  const hasPostedThisCycle = postedIds.includes(me.id);
  const pending = members.filter((m) => !postedIds.includes(m.id));
  const everyonePostedThisCycle =
    members.length > 0 && members.every((m) => postedIds.includes(m.id));
  const taskPosts = posts.filter((p) => p.taskId !== '');
  const hangoutPosts = posts.filter((p) => p.taskId === '');
  const unseenPosts = posts.filter(
    (p) => p.userId !== me.id && !seenPostIds.includes(p.id) && !p.id.startsWith('stub-')
  );
  const unseenReactions = unseenReactionNags(
    reactions,
    [...taskPosts, ...hangoutPosts],
    members,
    me.id,
    seenReactionIds
  );
  const unlocksAt = levelUnlocksAt(task.createdAt, group?.cadence ?? 'daily', task.level);
  const opensAt = levelOpensAt(task.createdAt, task.level);
  const taskLocked = !waived && Date.now() < opensAt;
  const waitingForPeriod =
    !taskLocked && everyonePostedThisCycle && !waived && Date.now() < unlocksAt;
  const cadencePendingOn = group?.pendingCadence
    ? members.filter((m) => !group.cadenceApprovals.includes(m.id))
    : [];

  // Nothing re-renders the mock family when the next period starts.
  const [, setClock] = useState(0);
  useEffect(() => {
    if (!taskLocked) return;
    const timer = setTimeout(
      () => setClock(Date.now()),
      Math.min(Math.max(opensAt - Date.now(), 1000), 60_000)
    );
    return () => clearTimeout(timer);
  }, [taskLocked, opensAt]);

  /** Tallies a vote, applying the cadence once every member has approved. */
  const castVote = useCallback(
    (cadence: Cadence, voterId: string) => {
      setGroup((g) => {
        if (!g) return g;
        const approvals = g.cadenceApprovals.includes(voterId)
          ? g.cadenceApprovals
          : [...g.cadenceApprovals, voterId];
        if (members.every((m) => approvals.includes(m.id))) {
          return { ...g, cadence, pendingCadence: undefined, cadenceApprovals: [] };
        }
        return { ...g, pendingCadence: cadence, cadenceApprovals: approvals };
      });
    },
    [members]
  );

  useEffect(() => {
    if (!group || group.awaitingNextGoal) return;
    const today = todayKey();
    const cycleDate = task.cycleDate ?? today;
    if (cycleDate >= today) return;
    const key = `${task.id}:${cycleDate}`;
    if (missChecked.current === key) return;
    missChecked.current = key;

    if (everyonePostedThisCycle) {
      rememberTask(newTask(task.prompt, task.level));
      return;
    }

    setMissedReset(true);
    setGroup({ ...group, level: 1, currentStreak: 0, awaitingNextGoal: false });
    rememberTask(newTask(taskPrompts[0], 1));
  }, [group, task, everyonePostedThisCycle, rememberTask]);

  const completeLevel = useCallback(async () => {
    setWaived(false);
    const prompt = await generatePrompt(seenPrompts.current.slice(-5));
    seenPrompts.current.push(prompt);
    let completedGoal = false;
    let nextLevel = 0;
    setGroup((g) => {
      if (!g || g.awaitingNextGoal) return g;
      setClearedLevel(g.level);
      nextLevel = g.level + 1;
      completedGoal = nextLevel > g.goal;
      return {
        ...g,
        level: completedGoal ? g.goal : nextLevel,
        currentStreak: g.currentStreak + 1,
        awaitingNextGoal: completedGoal,
      };
    });
    if (!completedGoal) rememberTask(newTask(prompt, nextLevel));
  }, [rememberTask]);

  const appendPost = useCallback(
    (userId: string, kind: Post['kind'], content: string, taskId: string, caption?: string) => {
      const id = `post-${userId}-${Date.now()}`;
      setPosts((prev) => [
        {
          id,
          taskId,
          groupId: mockGroup.id,
          userId,
          kind,
          content,
          caption,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      if (userId === CURRENT_USER_ID) {
        setSeenPostIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      }
    },
    []
  );

  const value = useMemo<State>(
    () => ({
      group,
      members,
      me,
      task,
      tasks,
      promptFor: (taskId) => promptForTasks(tasks, taskId),
      taskForLevel: (level) => latestTaskForLevel(tasks, level),
      myPostForLevel: (level) => {
        const remembered = latestTaskForLevel(tasks, level);
        if (!remembered) return undefined;
        return taskPosts.find((p) => p.taskId === remembered.id && p.userId === me.id);
      },
      posts: taskPosts,
      hangoutPosts,
      reactions,
      hasPostedThisCycle,
      everyonePostedThisCycle,
      waitingForPeriod,
      unlocksAt,
      opensAt,
      taskLocked,
      periodWaived: waived,
      setPeriodWaived: (on) => {
        setWaived(on);
        if (on && everyonePostedThisCycle) void completeLevel();
      },
      missedReset,
      dismissMissedReset: () => setMissedReset(false),
      unseenPosts,
      unseenReactions,
      pending,
      remindToPost: (memberId) => {
        const target = members.find((m) => m.id === memberId);
        if (!target?.expoPushToken || target.id === me.id) return;
        void sendExpoPush(target.expoPushToken, `${me.name} is waiting 👀`, task.prompt, {
          type: 'capture',
        });
      },
      clearedLevel,
      isLive: false,
      loading: false,
      error: null,
      dismissCelebration: () => setClearedLevel(null),
      createGroup: ({ myName, familyName, phone, goal, cadence, rewardText }) => {
        setGroup({
          ...mockGroup,
          name: familyName?.trim() || `${myName}'s family`,
          goal: clampLevelCount(goal),
          cadence,
          rewardText: rewardText || mockGroup.rewardText,
          level: 1,
          currentStreak: 0,
          awaitingNextGoal: false,
        });
        setMembers(withMe(myName, phone));
        setMissedReset(false);
        setPosts([]);
        setSeenPostIds([]);
        setSeenReactionIds([]);
        rememberTask(newTask(mockTask.prompt, 1), true);
      },
      joinGroup: ({ myName, phone }) => {
        setGroup({ ...mockGroup, awaitingNextGoal: false });
        setMembers(withMe(myName, phone));
        setMissedReset(false);
        setSeenPostIds(mockPosts.map((p) => p.id));
        setSeenReactionIds([]);
        rememberTask(mockTask, true);
      },
      updateSettings: ({ rewardText, goal, name }) => {
        setGroup((g) =>
          g ? { ...g, rewardText, goal: clampLevelCount(goal), name: name?.trim() || g.name } : g
        );
      },
      cadencePendingOn,
      proposeCadence: (cadence) => {
        if (!group) return;
        if (cadence === group.cadence) {
          setGroup((g) => (g ? { ...g, pendingCadence: undefined, cadenceApprovals: [] } : g));
          return;
        }
        setGroup((g) => (g ? { ...g, pendingCadence: cadence, cadenceApprovals: [] } : g));
        castVote(cadence, me.id);
        // The scripted relatives vote a moment later, so the demo can finish.
        members
          .filter((m) => m.id !== me.id)
          .forEach((m, i) => {
            timers.current.push(
              setTimeout(() => castVote(cadence, m.id), REPLY_DELAY_MS * (i + 1))
            );
          });
      },
      approveCadence: () => {
        if (!group?.pendingCadence) return;
        castVote(group.pendingCadence, me.id);
      },
      cancelCadenceChange: () => {
        clearTimers();
        setGroup((g) => (g ? { ...g, pendingCadence: undefined, cadenceApprovals: [] } : g));
      },
      addPost: (kind, content, channel = 'task', caption) => {
        if (channel === 'hangout') {
          appendPost(me.id, kind, content, '', caption);
          return { completedGoal: false };
        }
        appendPost(me.id, kind, content, task.id, caption);
        setMissedReset(false);

        if (hasPostedThisCycle) return { completedGoal: false };

        const others = members.filter((m) => m.id !== me.id);
        const cycleTaskId = task.id;
        others.forEach((member, i) => {
          const replies = familyReplies[member.id] ?? [];
          const reply = replies[Math.floor(Math.random() * replies.length)];
          if (!reply) return;
          timers.current.push(
            setTimeout(() => appendPost(member.id, reply.kind, reply.content, cycleTaskId), REPLY_DELAY_MS * (i + 1))
          );
        });
        const willComplete = Boolean(group && !group.awaitingNextGoal && group.level >= group.goal);
        timers.current.push(
          setTimeout(() => {
            if (Date.now() < unlocksAt && !waived) return;
            void completeLevel();
          }, REPLY_DELAY_MS * (others.length + 1))
        );
        return { completedGoal: willComplete };
      },
      addReaction: (postId, kind, val) => {
        setReactions((prev) => [...prev, { id: `r-${Date.now()}`, postId, userId: me.id, kind, value: val }]);
      },
      toggleLike: (postId) => {
        setReactions((prev) => {
          const mine = prev.find(
            (r) => r.postId === postId && r.kind === 'like' && r.userId === me.id
          );
          if (mine) return prev.filter((r) => r !== mine);
          return [...prev, { id: `r-${Date.now()}`, postId, userId: me.id, kind: 'like', value: '1' }];
        });
      },
      likedByMe: (postId) =>
        reactions.some((r) => r.postId === postId && r.kind === 'like' && r.userId === me.id),
      reactionsFor: (postId) => reactions.filter((r) => r.postId === postId),
      memberById: (id) => members.find((m) => m.id === id),
      updateProfile: ({ name, phone }) => {
        setMembers((prev) =>
          prev.map((m) => (m.id === CURRENT_USER_ID ? { ...m, name: name.trim() || m.name, phone } : m))
        );
      },
      leaveGroup: () => {
        clearTimers();
        setGroup(null);
        setMissedReset(false);
      },
      startNextGoal: (reward, levelCount) => {
        if (!group) return;
        setGroup({
          ...group,
          rewardText: reward.trim(),
          goal: clampLevelCount(levelCount),
          level: 1,
          currentStreak: 0,
          awaitingNextGoal: false,
        });
        setMissedReset(false);
        rememberTask(newTask(taskPrompts[0], 1));
      },
      simulateMissedDay: () => {
        if (!group) return;
        if (missedReset) {
          setMissedReset(false);
          return;
        }
        clearTimers();
        setMissedReset(true);
        setGroup({ ...group, level: 1, currentStreak: 0, awaitingNextGoal: false });
        rememberTask(newTask(taskPrompts[0], 1));
      },
      markPostSeen: (postId) => {
        setSeenPostIds((prev) => (prev.includes(postId) ? prev : [...prev, postId]));
        setSeenReactionIds((prev) =>
          mergeSeenIds(
            prev,
            reactions.filter((r) => r.postId === postId).map((r) => r.id)
          )
        );
      },
      restart: () => {
        clearTimers();
        seenPrompts.current = [mockTask.prompt];
        setGroup(null);
        setMembers(mockProfiles);
        rememberTask(mockTask, true);
        setPosts(mockPosts);
        setReactions(mockReactions);
        setClearedLevel(null);
        setMissedReset(false);
      },
    }),
    [
      group,
      members,
      me,
      task,
      tasks,
      taskPosts,
      hangoutPosts,
      reactions,
      hasPostedThisCycle,
      everyonePostedThisCycle,
      waitingForPeriod,
      unlocksAt,
      opensAt,
      taskLocked,
      cadencePendingOn,
      castVote,
      waived,
      missedReset,
      unseenPosts,
      unseenReactions,
      pending,
      clearedLevel,
      appendPost,
      completeLevel,
      clearTimers,
      rememberTask,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): State {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
