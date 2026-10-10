import type { Activity } from "@/features/activities/types/activity";
import type { EvaluationProgressItem } from "@/features/evaluations/types/evaluation";

export type ActivityProgressItem = Readonly<{
  id: string;
  title: string;
  category: Activity["category"];
  priority: Activity["priority"];
  activityDate: string;
  completionPercentage: number;
  isCompleted: boolean;
}>;

export type CategoryProgressItem = Readonly<{
  category: Activity["category"];
  label: string;
  activityCount: number;
  completionPercentage: number;
}>;

export type DailyFocusItem = Readonly<{
  date: string;
  label: string;
  minutes: number;
}>;

export type ProgressOverview = Readonly<{
  source: "demo" | "supabase";
  overallCompletion: number;
  totalActivities: number;
  completedActivities: number;
  pendingActivities: number;
  completedPomodoros: number;
  plannedFocusMinutes: number;
  actualFocusMinutes: number;
  activities: ActivityProgressItem[];
  categoryProgress: CategoryProgressItem[];
  dailyFocus: DailyFocusItem[];
  evaluations: EvaluationProgressItem[];
}>;

