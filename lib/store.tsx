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
import { clampLevelCount, todayKey } from './levels';
import { familyReplies, mockGroup, mockPosts, mockProfiles, mockReactions, mockTask, taskPrompts } from './mockData';
import { generatePrompt } from './prompts';
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
  /** Answers to the current level's task. */
  posts: Post[];
  /** Free posts that don't count toward the level. */
  hangoutPosts: Post[];
  reactions: Reaction[];
  hasPostedThisCycle: boolean;
  everyonePostedThisCycle: boolean;
  missedReset: boolean;
  unseenPosts: Post[];
  /** Members who still owe a post for the current task. */
  pending: Profile[];
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
  updateSettings: (patch: { cadence: Cadence; rewardText: string; goal: number }) => void;
  addPost: (kind: Post['kind'], content: string, channel?: Channel) => { completedGoal: boolean };
  addReaction: (postId: string, kind: Reaction['kind'], value: string) => void;
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
  const [posts, setPosts] = useState<Post[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [clearedLevel, setClearedLevel] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [seenPostIds, setSeenPostIds] = useState<string[]>([]);
  const [missedReset, setMissedReset] = useState(false);
  /** Last level this browser saw, so every member gets the celebration. */
  const lastLevel = useRef<number | null>(null);

  /** Fire-and-forget a backend call, surfacing whatever it refuses to do. */
  const run = useCallback((fn: () => Promise<void>) => {
    void fn().then(
      () => setError(null),
      (e: unknown) => setError(e instanceof Error ? e.message : String(e))
    );
  }, []);

  /** Pulls the whole family in one go, then clears the level if everyone posted. */
  const refresh = useCallback(async (groupId: string) => {
    const current = await api.getGroup(groupId);
    if (!current) {
      await api.rememberGroup(null);
      setGroup(null);
      lastLevel.current = null;
      return;
    }
    const [nextMembers, nextTask, nextPosts, nextReactions] = await Promise.all([
      api.getMembers(groupId),
      api.getCurrentTask(current),
      api.getPosts(groupId),
      api.getReactions(groupId),
    ]);
    setGroup(current);
    setMembers(nextMembers);
    setTask(nextTask);
    setPosts(nextPosts);
    setReactions(nextReactions);

    if (lastLevel.current !== null && current.level > lastLevel.current) {
      setClearedLevel(current.level - 1);
    }
    lastLevel.current = current.level;

    await api.clearLevelIfDone(current, nextMembers, nextTask, nextPosts);
  }, []);

  useEffect(() => {
    void (async () => {
      setUserId(await api.identity());
      const saved = await api.savedGroupId();
      if (saved) await refresh(saved);
      setLoading(false);
    })();
  }, [refresh]);

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

  const value = useMemo<State>(
    () => ({
      group,
      members,
      me,
      task,
      posts: taskPosts,
      hangoutPosts,
      reactions,
      hasPostedThisCycle,
      everyonePostedThisCycle,
      missedReset,
      unseenPosts,
      pending,
      clearedLevel,
      isLive: true,
      loading,
      error,
      dismissCelebration: () => setClearedLevel(null),
      createGroup: (opts) => {
        run(async () => {
          const created = await api.createGroup(userId, opts);
          await refresh(created.id);
        });
      },
      joinGroup: (opts) => {
        run(async () => {
          const joined = await api.joinGroup(userId, opts);
          await refresh(joined.id);
        });
      },
      updateSettings: (patch) => {
        if (!group) return;
        run(async () => {
          await api.updateGroup(group.id, patch);
          await refresh(group.id);
        });
      },
      addPost: (kind, content, channel = 'task') => {
        if (!group) return { completedGoal: false };
        run(async () => {
          await api.createPost({
            taskId: channel === 'hangout' ? null : task.id,
            groupId: group.id,
            userId,
            kind,
            content,
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
            cadence: group.cadence,
            rewardText: reward.trim(),
            goal: clampLevelCount(levelCount),
          });
          await refresh(group.id);
        });
      },
      simulateMissedDay: () => setMissedReset(true),
      markPostSeen: (postId) => {
        setSeenPostIds((prev) => (prev.includes(postId) ? prev : [...prev, postId]));
      },
      restart: () => {
        run(async () => {
          await api.saveProfile(userId, me.name, null);
          await api.rememberGroup(null);
          lastLevel.current = null;
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
      missedReset,
      unseenPosts,
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
});

function MockProvider({ children }: { children: React.ReactNode }) {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Profile[]>(mockProfiles);
  const [task, setTask] = useState<Task>(mockTask);
  const [posts, setPosts] = useState<Post[]>(mockPosts);
  const [reactions, setReactions] = useState<Reaction[]>(mockReactions);
  const [clearedLevel, setClearedLevel] = useState<number | null>(null);
  const [missedReset, setMissedReset] = useState(false);
  const [seenPostIds, setSeenPostIds] = useState<string[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const seenPrompts = useRef<string[]>([mockTask.prompt]);
  const missChecked = useRef<string | null>(null);

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

  useEffect(() => {
    if (!group || group.awaitingNextGoal) return;
    const today = todayKey();
    const cycleDate = task.cycleDate ?? today;
    if (cycleDate >= today) return;
    const key = `${task.id}:${cycleDate}`;
    if (missChecked.current === key) return;
    missChecked.current = key;

    if (everyonePostedThisCycle) {
      setTask(newTask(task.prompt, task.level));
      return;
    }

    setMissedReset(true);
    setGroup({ ...group, level: 1, currentStreak: 0, awaitingNextGoal: false });
    setTask(newTask(taskPrompts[0], 1));
  }, [group, task, everyonePostedThisCycle]);

  const completeLevel = useCallback(async () => {
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
    if (!completedGoal) setTask(newTask(prompt, nextLevel));
  }, []);

  const appendPost = useCallback((userId: string, kind: Post['kind'], content: string, taskId: string) => {
    const id = `post-${userId}-${Date.now()}`;
    setPosts((prev) => [
      {
        id,
        taskId,
        groupId: mockGroup.id,
        userId,
        kind,
        content,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    if (userId === CURRENT_USER_ID) {
      setSeenPostIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    }
  }, []);

  const value = useMemo<State>(
    () => ({
      group,
      members,
      me,
      task,
      posts: taskPosts,
      hangoutPosts,
      reactions,
      hasPostedThisCycle,
      everyonePostedThisCycle,
      missedReset,
      unseenPosts,
      pending,
      clearedLevel,
      isLive: false,
      loading: false,
      error: null,
      dismissCelebration: () => setClearedLevel(null),
      createGroup: ({ myName, phone, goal, cadence, rewardText }) => {
        setGroup({
          ...mockGroup,
          name: `${myName}'s family`,
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
        setTask(newTask(mockTask.prompt, 1));
      },
      joinGroup: ({ myName, phone }) => {
        setGroup({ ...mockGroup, awaitingNextGoal: false });
        setMembers(withMe(myName, phone));
        setMissedReset(false);
        setSeenPostIds(mockPosts.map((p) => p.id));
      },
      updateSettings: ({ cadence, rewardText, goal }) => {
        setGroup((g) => (g ? { ...g, cadence, rewardText, goal: clampLevelCount(goal) } : g));
      },
      addPost: (kind, content, channel = 'task') => {
        if (channel === 'hangout') {
          appendPost(me.id, kind, content, '');
          return { completedGoal: false };
        }
        appendPost(me.id, kind, content, task.id);
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
        timers.current.push(setTimeout(() => void completeLevel(), REPLY_DELAY_MS * (others.length + 1)));
        return { completedGoal: willComplete };
      },
      addReaction: (postId, kind, val) => {
        setReactions((prev) => [...prev, { id: `r-${Date.now()}`, postId, userId: me.id, kind, value: val }]);
      },
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
        setTask(newTask(taskPrompts[0], 1));
      },
      simulateMissedDay: () => {
        if (!group) return;
        clearTimers();
        setMissedReset(true);
        setGroup({ ...group, level: 1, currentStreak: 0, awaitingNextGoal: false });
        setTask(newTask(taskPrompts[0], 1));
      },
      markPostSeen: (postId) => {
        setSeenPostIds((prev) => (prev.includes(postId) ? prev : [...prev, postId]));
      },
      restart: () => {
        clearTimers();
        seenPrompts.current = [mockTask.prompt];
        setGroup(null);
        setMembers(mockProfiles);
        setTask(mockTask);
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
      taskPosts,
      hangoutPosts,
      reactions,
      hasPostedThisCycle,
      everyonePostedThisCycle,
      missedReset,
      unseenPosts,
      pending,
      clearedLevel,
      appendPost,
      completeLevel,
      clearTimers,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): State {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
