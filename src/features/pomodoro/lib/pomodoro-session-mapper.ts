import type {
  PomodoroSession,
  PomodoroSessionRow,
} from "@/features/pomodoro/types/pomodoro-session";

export function mapPomodoroSessionRow(
  row: PomodoroSessionRow,
): PomodoroSession {
  return {
    id: row.id,
    planBlockId: row.plan_block_id,
    activityId: row.activity_id,
    sessionType: row.session_type,
    status: row.status,
    plannedSeconds: row.planned_seconds,
    elapsedSeconds: row.elapsed_seconds,
    startedAt: row.started_at,
    lastResumedAt: row.last_resumed_at,
    endedAt: row.ended_at,
  };
}
