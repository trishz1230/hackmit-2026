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
import { familyReplies, mockGroup, mockPosts, mockProfiles, mockReactions, mockTask } from './mockData';
import { generatePrompt } from './prompts';
import { isSupabaseConfigured } from './supabase';
import type { Group, Post, Profile, Reaction, Task } from './types';

const CURRENT_USER_ID = 'user-1';

/** Mock family with the person at this browser renamed. */
const withMyName = (myName: string): Profile[] =>
  mockProfiles.map((p) => (p.id === CURRENT_USER_ID ? { ...p, name: myName } : p));
/** How long each simulated family member takes to answer the task (mock only). */
const REPLY_DELAY_MS = 2500;

type State = {
  group: Group | null;
  members: Profile[];
  me: Profile;
  task: Task;
  posts: Post[];
  reactions: Reaction[];
  hasPostedThisCycle: boolean;
  /** Members who still owe a post for the current task. */
  pending: Profile[];
  /** Level just cleared, for the celebration overlay; null once dismissed. */
  clearedLevel: number | null;
  /** True once every member is real rather than scripted. */
  isLive: boolean;
  /** Last thing the backend refused to do, for the onboarding screen. */
  error: string | null;
  dismissCelebration: () => void;
  createGroup: (name: string, goal: number, myName: string) => void;
  joinGroup: (code: string, myName: string) => void;
  addPost: (kind: Post['kind'], content: string) => void;
  addReaction: (postId: string, kind: Reaction['kind'], value: string) => void;
  reactionsFor: (postId: string) => Reaction[];
  memberById: (id: string) => Profile | undefined;
  restart: () => void;
};

const AppContext = createContext<State | null>(null);

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

    const cleared = await api.clearLevelIfDone(current, nextMembers, nextTask, nextPosts);
    if (cleared !== null) setClearedLevel(cleared);
  }, []);

  // Restore this device's identity and last family on boot.
  useEffect(() => {
    void (async () => {
      setUserId(await api.identity());
      const saved = await api.savedGroupId();
      if (saved) await refresh(saved);
    })();
  }, [refresh]);

  // Realtime: any change anyone makes re-pulls the family.
  useEffect(() => {
    if (!group) return;
    const groupId = group.id;
    return api.subscribeToGroup(groupId, () => void refresh(groupId));
  }, [group?.id, refresh]);

  const me =
    members.find((m) => m.id === userId) ??
    { id: userId, name: 'You', groupId: group?.id ?? '', avatar: '🙂' };
  const postedIds = posts.filter((p) => p.taskId === task.id).map((p) => p.userId);
  const hasPostedThisCycle = postedIds.includes(userId);
  const pending = members.filter((m) => !postedIds.includes(m.id));

  const value = useMemo<State>(
    () => ({
      group,
      members,
      me,
      task,
      posts,
      reactions,
      hasPostedThisCycle,
      pending,
      clearedLevel,
      isLive: true,
      error,
      dismissCelebration: () => setClearedLevel(null),
      createGroup: (name, goal, myName) => {
        run(async () => {
          const created = await api.createGroup(userId, myName, name, goal);
          await refresh(created.id);
        });
      },
      joinGroup: (code, myName) => {
        run(async () => {
          const joined = await api.joinGroup(userId, myName, code);
          await refresh(joined.id);
        });
      },
      addPost: (kind, content) => {
        if (!group) return;
        run(async () => {
          await api.createPost({ taskId: task.id, groupId: group.id, userId, kind, content });
          await refresh(group.id);
        });
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
      restart: () => {
        run(async () => {
          await api.saveProfile(userId, me.name, null);
          await api.rememberGroup(null);
          setGroup(null);
          setMembers([]);
          setPosts([]);
          setReactions([]);
          setClearedLevel(null);
        });
      },
    }),
    [group, members, me, task, posts, reactions, hasPostedThisCycle, pending, clearedLevel, error, run, userId, refresh]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/* ------------------------------------------------------------------ mock */

const newTask = (prompt: string, level: number): Task => ({
  id: `task-${Date.now()}`,
  groupId: mockGroup.id,
  prompt,
  level,
});

function MockProvider({ children }: { children: React.ReactNode }) {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Profile[]>(mockProfiles);
  const [task, setTask] = useState<Task>(mockTask);
  const [posts, setPosts] = useState<Post[]>(mockPosts);
  const [reactions, setReactions] = useState<Reaction[]>(mockReactions);
  const [clearedLevel, setClearedLevel] = useState<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const seenPrompts = useRef<string[]>([mockTask.prompt]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const me = members.find((m) => m.id === CURRENT_USER_ID) ?? mockProfiles[0];
  const postedIds = posts.filter((p) => p.taskId === task.id).map((p) => p.userId);
  const hasPostedThisCycle = postedIds.includes(me.id);
  const pending = members.filter((m) => !postedIds.includes(m.id));

  /** Everyone answered, so the family clears the level and draws a new task. */
  const completeLevel = useCallback(async () => {
    const prompt = await generatePrompt(seenPrompts.current.slice(-5));
    seenPrompts.current.push(prompt);
    let nextLevel = 1;
    setGroup((g) => {
      if (!g) return g;
      setClearedLevel(g.level);
      nextLevel = Math.min(g.level + 1, g.goal);
      return { ...g, level: nextLevel, currentStreak: g.currentStreak + 1 };
    });
    setTask(newTask(prompt, nextLevel));
  }, []);

  const appendPost = useCallback((userId: string, kind: Post['kind'], content: string, taskId: string) => {
    setPosts((prev) => [
      {
        id: `post-${userId}-${Date.now()}`,
        taskId,
        groupId: mockGroup.id,
        userId,
        kind,
        content,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  }, []);

  const value = useMemo<State>(
    () => ({
      group,
      members,
      me,
      task,
      posts,
      reactions,
      hasPostedThisCycle,
      pending,
      clearedLevel,
      isLive: false,
      error: null,
      dismissCelebration: () => setClearedLevel(null),
      createGroup: (name, goal, myName) => {
        setGroup({ ...mockGroup, name, goal });
        setMembers(withMyName(myName));
      },
      joinGroup: (_code, myName) => {
        setGroup(mockGroup);
        setMembers(withMyName(myName));
      },
      addPost: (kind, content) => {
        if (hasPostedThisCycle) {
          appendPost(me.id, kind, content, task.id);
          return;
        }
        appendPost(me.id, kind, content, task.id);

        // The rest of the family answers the same task, then the level clears.
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
        timers.current.push(setTimeout(() => void completeLevel(), REPLY_DELAY_MS * (others.length + 1)));
      },
      addReaction: (postId, kind, val) => {
        setReactions((prev) => [...prev, { id: `r-${Date.now()}`, postId, userId: me.id, kind, value: val }]);
      },
      reactionsFor: (postId) => reactions.filter((r) => r.postId === postId),
      memberById: (id) => members.find((m) => m.id === id),
      restart: () => {
        clearTimers();
        seenPrompts.current = [mockTask.prompt];
        setGroup(null);
        setMembers(mockProfiles);
        setTask(mockTask);
        setPosts(mockPosts);
        setReactions(mockReactions);
        setClearedLevel(null);
      },
    }),
    [
      group,
      members,
      me,
      task,
      posts,
      reactions,
      hasPostedThisCycle,
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
