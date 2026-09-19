/**
 * Mock-backed app state so the UI runs with zero configuration.
 * Person A swaps each of these bodies for the matching call in lib/api.ts
 * once the Supabase project is set up; the UI never has to change.
 */
import React, { createContext, useContext, useMemo, useState } from 'react';
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
  createGroup: (name: string, goal: number) => void;
  joinGroup: (code: string) => void;
  addPost: (kind: Post['kind'], content: string) => void;
  addReaction: (postId: string, kind: Reaction['kind'], value: string) => void;
  reactionsFor: (postId: string) => Reaction[];
  memberById: (id: string) => Profile | undefined;
  nextTask: () => void;
};

const AppContext = createContext<State | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Profile[]>(mockProfiles);
  const [task, setTask] = useState<Task>(mockTask);
  const [posts, setPosts] = useState<Post[]>(mockPosts);
  const [reactions, setReactions] = useState<Reaction[]>(mockReactions);

  const me = members.find((m) => m.id === CURRENT_USER_ID) ?? mockProfiles[0];
  const hasPostedThisCycle = posts.some((p) => p.taskId === task.id && p.userId === me.id);

  const value = useMemo<State>(
    () => ({
      group,
      members,
      me,
      task,
      posts,
      reactions,
      hasPostedThisCycle,
      createGroup: (name, goal) => {
        setGroup({ ...mockGroup, name, goal });
        setMembers(mockProfiles);
      },
      joinGroup: () => {
        setGroup(mockGroup);
        setMembers(mockProfiles);
      },
      addPost: (kind, content) => {
        setPosts((prev) => [
          {
            id: `post-${Date.now()}`,
            taskId: task.id,
            groupId: task.groupId,
            userId: me.id,
            kind,
            content,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      },
      addReaction: (postId, kind, val) => {
        setReactions((prev) => [
          ...prev,
          { id: `r-${Date.now()}`, postId, userId: me.id, kind, value: val },
        ]);
      },
      reactionsFor: (postId) => reactions.filter((r) => r.postId === postId),
      memberById: (id) => members.find((m) => m.id === id),
      nextTask: () => {
        const index = (taskPrompts.indexOf(task.prompt) + 1) % taskPrompts.length;
        setTask({ ...task, id: `task-${Date.now()}`, prompt: taskPrompts[index] });
        setGroup((g) => (g ? { ...g, level: g.level + 1, currentStreak: g.currentStreak + 1 } : g));
      },
    }),
    [group, members, me, task, posts, reactions, hasPostedThisCycle]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): State {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
