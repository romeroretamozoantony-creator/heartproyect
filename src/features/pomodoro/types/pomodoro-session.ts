import type { PlanBlock } from "@/features/planner/types/study-plan";

export type PomodoroSessionType = "focus" | "rest";

export type PomodoroSession = Readonly<{
  id: string;
  planBlockId: string;
  activityId: string | null;
  sessionType: PomodoroSessionType;
  status: PlanBlock["status"];
  plannedSeconds: number;
  elapsedSeconds: number;
  startedAt: string | null;
  lastResumedAt: string | null;
  endedAt: string | null;
}>;

export type PomodoroSessionRow = Readonly<{
  id: string;
  plan_block_id: string;
  activity_id: string | null;
  session_type: PomodoroSessionType;
  status: PlanBlock["status"];
  planned_seconds: number;
  elapsed_seconds: number;
  started_at: string | null;
  last_resumed_at: string | null;
  ended_at: string | null;
}>;

export type PomodoroTransition =
  | "start"
  | "pause"
  | "resume"
  | "complete"
  | "cancel";

export type PomodoroSummary = Readonly<{
  totalBlocks: number;
  completedBlocks: number;
  focusSeconds: number;
  restSeconds: number;
}>;
