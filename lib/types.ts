export type Cadence = 'daily' | 'twice_weekly' | 'weekly';

export type Group = {
  id: string;
  name: string;
  joinCode: string;
  goal: number;
  level: number;
  cadence: Cadence;
  rewardText: string;
  currentStreak: number;
};

export type Profile = {
  id: string;
  name: string;
  groupId: string;
  avatar: string;
  phone?: string;
};

export type Task = {
  id: string;
  groupId: string;
  prompt: string;
  /** The level this task clears. */
  level: number;
};

export type Post = {
  id: string;
  taskId: string;
  groupId: string;
  userId: string;
  kind: 'photo' | 'text';
  content: string;
  createdAt: string;
};

export type Reaction = {
  id: string;
  postId: string;
  userId: string;
  kind: 'like' | 'emoji' | 'comment';
  value: string;
};
