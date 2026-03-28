export interface User {
  id: string;
  email: string;
  name: string;
  currentHouseholdId: string | null;
  accounts?: Array<{ id: string; provider: string; providerAccountId: string }>;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Household {
  id: string;
  name: string;
  createdAt: string;
  memberCount: number;
}

export interface HouseholdMember {
  userId: string;
  householdId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  joinedAt: string;
  user: User;
}

export interface HouseholdInvite {
  code: string;
  expiresAt: string;
  householdId: string;
  householdName: string;
}

export type TaskType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ONE_TIME';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type CompletionType = 'FULL' | 'PARTIAL';

export interface Task {
  id: string;
  name: string;
  description: string | null;
  type: TaskType;
  priority: TaskPriority;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  deadline: string | null;
  isActive: boolean;
  householdId: string;
  createdAt: string;
  completed: boolean;
  completionType: CompletionType | null;
}

export interface TaskCompletion {
  id: string;
  completedAt: string;
  type: CompletionType;
  taskId: string;
  userId: string;
}

export type NoticePriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notice {
  id: string;
  title: string;
  content: string;
  priority: NoticePriority;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  householdId: string;
  createdAt: string;
  createdBy: string;
}

export interface ShoppingList {
  id: string;
  name: string;
  householdId: string;
  createdAt: string;
  items: ShoppingItem[];
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string | null;
  isChecked: boolean;
  listId: string;
}

export interface Streak {
  current: number;
  longest: number;
  lastCompletedDate: string | null;
}
