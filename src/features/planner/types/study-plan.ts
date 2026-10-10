export type PlanStatus =
  | "draft"
  | "confirmed"
  | "restructured"
  | "completed"
  | "cancelled";

export type PlanBlockType =
  | "study"
  | "break"
  | "review"
  | "test"
  | "analysis";

export type GeneratedPlanBlock = Readonly<{
  activityId: string | null;
  blockType: PlanBlockType;
  position: number;
  title: string;
  scheduledStart: string;
  scheduledEnd: string;
  plannedMinutes: number;
}>;

export type StudyPlan = Readonly<{
  id: string;
  name: string;
  status: PlanStatus;
  confirmedAt: string | null;
  createdAt: string;
}>;

export type StudyPlanRow = Readonly<{
  id: string;
  name: string;
  status: PlanStatus;
  confirmed_at: string | null;
  created_at: string;
}>;

export type PlanBlock = GeneratedPlanBlock &
  Readonly<{
    id: string;
    status: "pending" | "running" | "paused" | "completed" | "cancelled";
  }>;

export type PlanBlockRow = Readonly<{
  id: string;
  activity_id: string | null;
  block_type: PlanBlockType;
  position: number;
  title: string;
  scheduled_start: string;
  scheduled_end: string;
  planned_minutes: number;
  status: PlanBlock["status"];
}>;
