"use client";

import { useState } from "react";

import { PlanControls } from "@/features/planner/components/plan-controls";
import type {
  PlanBlock,
  PlanStatus,
  StudyPlan,
} from "@/features/planner/types/study-plan";
import { PomodoroTimer } from "@/features/pomodoro/components/pomodoro-timer";
import type {
  PomodoroSession,
  PomodoroSummary,
} from "@/features/pomodoro/types/pomodoro-session";

type PlanExecutionPanelProps = Readonly<{
  demoMode: boolean;
  activeSession: PomodoroSession | null;
  blocks: readonly PlanBlock[];
  plan: StudyPlan;
  summary: PomodoroSummary;
}>;

export function PlanExecutionPanel({
  demoMode,
  activeSession,
  blocks,
  plan,
  summary,
}: PlanExecutionPanelProps) {
  const [planStatus, setPlanStatus] = useState<PlanStatus>(plan.status);

  return (
    <div className="space-y-6">
      <PlanControls plan={plan} onStatusChange={setPlanStatus} />
      <PomodoroTimer
        demoMode={demoMode}
        blocks={blocks}
        enabled={planStatus === "confirmed"}
        initialSession={activeSession}
        planId={plan.id}
        summary={summary}
      />
    </div>
  );
}
