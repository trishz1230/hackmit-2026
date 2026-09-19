/** How long the family gets to clear one level. */
export type Cadence = 'daily' | 'every_3_days' | 'weekly';

export const CADENCE_LABELS: Record<Cadence, string> = {
  daily: '1 day',
  every_3_days: '3 days',
  weekly: 'a week',
};

/** Everything the create-a-family form collects. */
export type CreateOptions = {
  myName: string;
  phone?: string;
  cadence: Cadence;
  rewardText: string;
  /** Levels between here and the reward. */
  goal: number;
};

export type JoinOptions = {
  myName: string;
  phone?: string;
  code: string;
};

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
