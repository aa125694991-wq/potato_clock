export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  points: number;
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

export type TaskCategory = 'work' | 'meeting' | 'exercise' | 'personal' | 'rest';

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  
  // Categorization
  category: TaskCategory;
  color?: string; // Optional hex or tailwind class identifier
  
  // Scheduling
  duration: number; // in minutes (default 30 or 25)
  startMinutes?: number; // Minutes from midnight (e.g., 600 = 10:00 AM)
  dayIndex?: number; // 0=Sunday, 1=Monday...
  
  // Legacy/Computed
  estimatedPomodoros: number; 
  completedPomodoros: number;
}

export interface PomodoroSession {
  id: string;
  taskId: string;
  taskTitle: string;
  startTime: number;
  endTime: number | null;
  durationMinutes: number;
  type: 'WORK' | 'BREAK';
  status: 'COMPLETED' | 'INTERRUPTED';
  interruptionReason?: string;
}

export interface DailyReview {
  id: string;
  date: string; // YYYY-MM-DD
  score: number; // 1-10
  reflection: string;
}

export interface RewardItem {
  id: string;
  name: string;
  probability: number; // 0-100
  icon: string;
}

export const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
