/** How long the family gets to clear one level. */
export type Cadence = 'daily' | 'every_3_days' | 'weekly';

export const CADENCE_LABELS: Record<Cadence, string> = {
  daily: '1 day',
  every_3_days: '3 days',
  weekly: '1 week',
};

/** Everything the create-a-family form collects. */
export type CreateOptions = {
  myName: string;
  /** What the family calls itself; defaults to "<myName>'s family". */
  familyName?: string;
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
  awaitingNextGoal: boolean;
  /** Cadence the family has been asked to switch to, until everyone approves. */
  pendingCadence?: Cadence;
  /** Ids of the members who approved the pending cadence. */
  cadenceApprovals: string[];
};

export type Profile = {
  id: string;
  name: string;
  groupId: string;
  avatar: string;
  phone?: string;
  expoPushToken?: string;
};

export type Task = {
  id: string;
  groupId: string;
  prompt: string;
  /** The level this task clears. */
  level: number;
  /** Calendar day this cycle started (YYYY-MM-DD). Used to detect a missed day. */
  cycleDate?: string;
  /** When the level started, i.e. when this level's wait is measured from. */
  createdAt?: string;
};

export type Post = {
  id: string;
  taskId: string;
  groupId: string;
  userId: string;
  kind: 'photo' | 'text' | 'voice';
  /** The words themselves for text, otherwise the photo or recording's url. */
  content: string;
  /** Words written under a photo or a recording. Text posts keep everything in `content`. */
  caption?: string;
  createdAt: string;
};

export type Reaction = {
  id: string;
  postId: string;
  userId: string;
  kind: 'like' | 'emoji' | 'comment';
  value: string;
};
