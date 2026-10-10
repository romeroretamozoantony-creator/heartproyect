import type { PomodoroSession } from "@/features/pomodoro/types/pomodoro-session";

export function elapsedSessionSeconds(session: PomodoroSession, now = Date.now()) {
  const runningSeconds = session.status === "running" && session.lastResumedAt
    ? Math.max(0, Math.floor((now - new Date(session.lastResumedAt).getTime()) / 1000))
    : 0;
  return Math.min(session.plannedSeconds, session.elapsedSeconds + runningSeconds);
}
