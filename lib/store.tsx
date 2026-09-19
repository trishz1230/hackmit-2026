/**
 * Mock-backed app state so the UI runs with zero configuration.
 * Person A swaps each of these bodies for the matching call in lib/api.ts
 * once the Supabase project is set up; the UI never has to change.
 */
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { clampLevelCount, todayKey } from './levels';
import { mockGroup, mockPosts, mockProfiles, mockReactions, mockTask, taskPrompts } from './mockData';
import type { Group, Post, Profile, Reaction, Task } from './types';

const CURRENT_USER_ID = 'user-1';

type State = {
  group: Group | null;
  members: Profile[];
  me: Profile;
  task: Task;
  posts: Post[];
  reactions: Reaction[];
  hasPostedThisCycle: boolean;
  everyonePostedThisCycle: boolean;
  missedReset: boolean;
  unseenPosts: Post[];
  createGroup: (name: string, goal: number) => void;
  joinGroup: (code: string) => void;
  addPost: (kind: Post['kind'], content: string) => { completedGoal: boolean };
  addReaction: (postId: string, kind: Reaction['kind'], value: string) => void;
  reactionsFor: (postId: string) => Reaction[];
  memberById: (id: string) => Profile | undefined;
  updateProfile: (input: { name: string; phone?: string }) => void;
  leaveGroup: () => void;
  startNextGoal: (reward: string, levelCount: number) => void;
  simulateMissedDay: () => void;
  markPostSeen: (postId: string) => void;
};

const AppContext = createContext<State | null>(null);

function nextPrompt(current: string) {
  const index = (taskPrompts.indexOf(current) + 1) % taskPrompts.length;
  return taskPrompts[index];
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Profile[]>(mockProfiles);
  const [task, setTask] = useState<Task>(mockTask);
  const [posts, setPosts] = useState<Post[]>(mockPosts);
  const [reactions, setReactions] = useState<Reaction[]>(mockReactions);
  const [missedReset, setMissedReset] = useState(false);
  const [seenPostIds, setSeenPostIds] = useState<string[]>([]);
  const missChecked = useRef<string | null>(null);

  const me = members.find((m) => m.id === CURRENT_USER_ID) ?? mockProfiles[0];
  const cyclePosts = posts.filter((p) => p.taskId === task.id);
  const hasPostedThisCycle = cyclePosts.some((p) => p.userId === me.id);
  const everyonePostedThisCycle =
    members.length > 0 && members.every((m) => cyclePosts.some((p) => p.userId === m.id));
  const unseenPosts = posts.filter(
    (p) =>
      p.userId !== me.id &&
      !seenPostIds.includes(p.id) &&
      !p.id.startsWith('stub-')
  );

  const familyStubPosts = (taskId: string, groupId: string): Post[] =>
    members
      .filter((m) => m.id !== CURRENT_USER_ID)
      .map((m) => ({
        id: `stub-${taskId}-${m.id}`,
        taskId,
        groupId,
        userId: m.id,
        kind: 'text' as const,
        content: 'Done for today.',
        createdAt: new Date().toISOString(),
      }));

  const startCycle = (prompt: string, groupId: string, seedFamily: boolean) => {
    const id = `task-${Date.now()}`;
    setTask({ id, groupId, prompt, cycleDate: todayKey() });
    if (seedFamily) {
      const stubs = familyStubPosts(id, groupId);
      setPosts((prev) => [...stubs, ...prev]);
      setSeenPostIds((prev) => [...prev, ...stubs.map((s) => s.id)]);
    }
  };

  useEffect(() => {
    if (!group || group.awaitingNextGoal) return;
    const today = todayKey();
    if (task.cycleDate >= today) return;
    const key = `${task.id}:${task.cycleDate}`;
    if (missChecked.current === key) return;
    missChecked.current = key;

    if (everyonePostedThisCycle) {
      startCycle(nextPrompt(task.prompt), group.id, true);
      return;
    }

    setMissedReset(true);
    setGroup({ ...group, level: 0, currentStreak: 0, awaitingNextGoal: false });
    startCycle(taskPrompts[0], group.id, true);
  }, [group, task, everyonePostedThisCycle]);

  const value = useMemo<State>(
    () => ({
      group,
      members,
      me,
      task,
      posts,
      reactions,
      hasPostedThisCycle,
      everyonePostedThisCycle,
      missedReset,
      unseenPosts,
      createGroup: (name, goal) => {
        const g: Group = {
          ...mockGroup,
          name: name.trim() || 'My family',
          goal: clampLevelCount(goal),
          level: 0,
          currentStreak: 0,
          awaitingNextGoal: false,
        };
        setGroup(g);
        setMembers(mockProfiles);
        setMissedReset(false);
        setPosts([]);
        setSeenPostIds([]);
        startCycle(mockTask.prompt, g.id, true);
      },
      joinGroup: () => {
        setGroup({ ...mockGroup, awaitingNextGoal: false });
        setMembers(mockProfiles);
        setMissedReset(false);
        setSeenPostIds(mockPosts.map((p) => p.id));
      },
      addPost: (kind, content) => {
        const newPost: Post = {
          id: `post-${Date.now()}`,
          taskId: task.id,
          groupId: task.groupId,
          userId: me.id,
          kind,
          content,
          createdAt: new Date().toISOString(),
        };
        const nextPosts = [newPost, ...posts];
        const posted = members.every(
          (m) => m.id === me.id || nextPosts.some((p) => p.taskId === task.id && p.userId === m.id)
        );
        setPosts(nextPosts);
        setMissedReset(false);
        setSeenPostIds((prev) => (prev.includes(newPost.id) ? prev : [...prev, newPost.id]));

        let completedGoal = false;
        if (posted && group && !group.awaitingNextGoal) {
          const nextLevel = group.level + 1;
          completedGoal = nextLevel >= group.goal;
          setGroup({
            ...group,
            level: Math.min(nextLevel, group.goal),
            currentStreak: group.currentStreak + 1,
            awaitingNextGoal: completedGoal,
          });
        }
        return { completedGoal };
      },
      addReaction: (postId, kind, val) => {
        setReactions((prev) => [
          ...prev,
          { id: `r-${Date.now()}`, postId, userId: me.id, kind, value: val },
        ]);
      },
      reactionsFor: (postId) => reactions.filter((r) => r.postId === postId),
      memberById: (id) => members.find((m) => m.id === id),
      updateProfile: ({ name, phone }) => {
        setMembers((prev) =>
          prev.map((m) => (m.id === CURRENT_USER_ID ? { ...m, name: name.trim() || m.name, phone } : m))
        );
      },
      leaveGroup: () => {
        setGroup(null);
        setMissedReset(false);
      },
      startNextGoal: (reward, levelCount) => {
        if (!group) return;
        setGroup({
          ...group,
          rewardText: reward.trim(),
          goal: clampLevelCount(levelCount),
          level: 0,
          currentStreak: 0,
          awaitingNextGoal: false,
        });
        setMissedReset(false);
        startCycle(nextPrompt(task.prompt), group.id, true);
      },
      simulateMissedDay: () => {
        if (!group) return;
        setMissedReset(true);
        setGroup({ ...group, level: 0, currentStreak: 0, awaitingNextGoal: false });
        startCycle(taskPrompts[0], group.id, true);
      },
      markPostSeen: (postId) => {
        setSeenPostIds((prev) => (prev.includes(postId) ? prev : [...prev, postId]));
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
      everyonePostedThisCycle,
      missedReset,
      unseenPosts,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): State {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
