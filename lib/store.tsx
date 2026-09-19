/**
 * Mock-backed app state so the UI runs with zero configuration.
 * Person A swaps each of these bodies for the matching call in lib/api.ts
 * once the Supabase project is set up; the UI never has to change.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { familyReplies, mockGroup, mockPosts, mockProfiles, mockReactions, mockTask } from './mockData';
import { generatePrompt } from './prompts';
import type { Group, Post, Profile, Reaction, Task } from './types';

const CURRENT_USER_ID = 'user-1';
/** How long each simulated family member takes to answer the task. */
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
  dismissCelebration: () => void;
  createGroup: (name: string, goal: number) => void;
  joinGroup: (code: string) => void;
  addPost: (kind: Post['kind'], content: string) => void;
  addReaction: (postId: string, kind: Reaction['kind'], value: string) => void;
  reactionsFor: (postId: string) => Reaction[];
  memberById: (id: string) => Profile | undefined;
  restart: () => void;
};

const AppContext = createContext<State | null>(null);

const newTask = (prompt: string): Task => ({
  id: `task-${Date.now()}`,
  groupId: mockGroup.id,
  prompt,
  cycleDate: new Date().toISOString().slice(0, 10),
});

export function AppProvider({ children }: { children: React.ReactNode }) {
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
    setGroup((g) => {
      if (!g) return g;
      setClearedLevel(g.level);
      return { ...g, level: Math.min(g.level + 1, g.goal), currentStreak: g.currentStreak + 1 };
    });
    setTask(newTask(prompt));
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
      dismissCelebration: () => setClearedLevel(null),
      createGroup: (name, goal) => {
        setGroup({ ...mockGroup, name, goal });
        setMembers(mockProfiles);
      },
      joinGroup: () => {
        setGroup(mockGroup);
        setMembers(mockProfiles);
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
        setReactions((prev) => [
          ...prev,
          { id: `r-${Date.now()}`, postId, userId: me.id, kind, value: val },
        ]);
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
