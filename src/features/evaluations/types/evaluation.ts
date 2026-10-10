export type EvaluationLevel =
  | "needs_reinforcement"
  | "satisfactory"
  | "outstanding";

export type EvaluationStatus =
  | "not_requested"
  | "pending"
  | "generating"
  | "ready"
  | "in_progress"
  | "completed"
  | "failed";

export type EvaluationProgressItem = Readonly<{
  id: string | null;
  fileId: string;
  activityId: string;
  activityTitle: string;
  fileName: string;
  status: EvaluationStatus;
  score: number | null;
  level: EvaluationLevel | null;
  feedback: string | null;
  completedAt: string | null;
}>;

