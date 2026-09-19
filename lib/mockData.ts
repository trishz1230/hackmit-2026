import type { Group, Post, Profile, Reaction, Task } from './types';

export const mockGroup: Group = {
  id: 'group-1',
  name: 'The Zhangs',
  joinCode: 'FAM123',
  goal: 50,
  level: 1,
  cadence: 'daily',
  rewardText: 'Pizza night, on Dad',
  currentStreak: 0,
  awaitingNextGoal: false,
  cadenceApprovals: [],
};

export const mockProfiles: Profile[] = [
  { id: 'user-1', name: 'You', groupId: 'group-1', avatar: '🙂', phone: '5551234567' },
  { id: 'user-2', name: 'Mom', groupId: 'group-1', avatar: '👩', phone: '6786876636' },
  { id: 'user-3', name: 'Dad', groupId: 'group-1', avatar: '👨', phone: '5553456789' },
  { id: 'user-4', name: 'Kevin', groupId: 'group-1', avatar: '🧑', phone: '5554567890' },
];

export const mockTask: Task = {
  id: 'task-1',
  groupId: 'group-1',
  prompt: 'Send a pic of what you ate today',
  level: 1,
};

/** A fresh family starts with an empty feed and clears level 1 together. */
export const mockPosts: Post[] = [];

export const mockReactions: Reaction[] = [];

/**
 * Canned replies from the rest of the family. Nobody else is really using the
 * demo, so once you post, they answer the same task a few seconds later and the
 * level clears.
 */
export const familyReplies: Record<string, { kind: Post['kind']; content: string }[]> = {
  'user-2': [
    { kind: 'photo', content: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&q=60' },
    { kind: 'text', content: 'Leftover dumplings again. No regrets.' },
  ],
  'user-3': [
    { kind: 'photo', content: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=60' },
    { kind: 'text', content: 'Grilled fish + too much rice 🍚' },
  ],
  'user-4': [
    { kind: 'text', content: 'Dining hall pasta. 3/10, would not recommend.' },
    { kind: 'photo', content: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800&q=60' },
  ],
};

export const taskPrompts = [
  'Send a pic of what you ate today',
  'Show us your view right now',
  'One good thing that happened today',
  'Send a photo of something that made you laugh',
  'What are you grateful for today?',
];
