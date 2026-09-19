import type { Group, Post, Profile, Reaction, Task } from './types';

export const mockGroup: Group = {
  id: 'group-1',
  name: 'The Zhangs',
  joinCode: 'FAM123',
  goal: 50,
  level: 12,
  cadence: 'daily',
  rewardText: 'Pizza night, on Dad',
  currentStreak: 12,
};

export const mockProfiles: Profile[] = [
  { id: 'user-1', name: 'You', groupId: 'group-1', avatar: '🙂', phone: '5551234567' },
  { id: 'user-2', name: 'Mom', groupId: 'group-1', avatar: '👩', phone: '5552345678' },
  { id: 'user-3', name: 'Dad', groupId: 'group-1', avatar: '👨', phone: '5553456789' },
  { id: 'user-4', name: 'Kevin', groupId: 'group-1', avatar: '🧑', phone: '5554567890' },
];

export const mockTask: Task = {
  id: 'task-1',
  groupId: 'group-1',
  prompt: 'Send a pic of what you ate today',
  cycleDate: new Date().toISOString().slice(0, 10),
};

export const mockPosts: Post[] = [
  {
    id: 'post-1',
    taskId: 'task-1',
    groupId: 'group-1',
    userId: 'user-2',
    kind: 'photo',
    content: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=60',
    createdAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
  },
  {
    id: 'post-2',
    taskId: 'task-1',
    groupId: 'group-1',
    userId: 'user-3',
    kind: 'photo',
    content: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=60',
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: 'post-3',
    taskId: 'task-1',
    groupId: 'group-1',
    userId: 'user-4',
    kind: 'text',
    content: 'Dining hall pasta. 3/10, would not recommend.',
    createdAt: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
  },
];

export const mockReactions: Reaction[] = [
  { id: 'r-1', postId: 'post-1', userId: 'user-3', kind: 'like', value: '1' },
  { id: 'r-2', postId: 'post-1', userId: 'user-4', kind: 'emoji', value: '😂' },
  { id: 'r-3', postId: 'post-2', userId: 'user-2', kind: 'comment', value: 'looks good!' },
];

export const taskPrompts = [
  'Send a pic of what you ate today',
  'Show us your view right now',
  'One good thing that happened today',
  'Send a photo of something that made you laugh',
  'What are you grateful for today?',
];
