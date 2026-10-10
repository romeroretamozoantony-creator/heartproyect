import type { DemoState } from "@/features/demo/store";
import { elapsedSessionSeconds } from "@/features/pomodoro/lib/session-clock";
import type { PomodoroSession, PomodoroTransition } from "@/features/pomodoro/types/pomodoro-session";

export function applyDemoTransition(state: DemoState, blockId: string, transition: PomodoroTransition, now = new Date()): PomodoroSession {
  const block = state.blocks.find((item) => item.id === blockId);
  if (!block || state.plan?.status !== "confirmed") throw new Error("Confirma un plan disponible antes de iniciar.");
  const active = state.sessions.find((item) => item.status === "running" || item.status === "paused");
  const timestamp = now.toISOString();
  if (transition === "start") {
    if (active?.planBlockId === blockId) return active;
    if (active) throw new Error("Completa o cancela la sesión actual antes de iniciar otra.");
    if (block.status === "completed") throw new Error("Este bloque ya está completado.");
    const session: PomodoroSession = {
      id: crypto.randomUUID(), planBlockId: block.id, activityId: block.activityId,
      sessionType: block.blockType === "break" ? "rest" : "focus", status: "running",
      plannedSeconds: block.plannedMinutes * 60, elapsedSeconds: 0,
      startedAt: timestamp, lastResumedAt: timestamp, endedAt: null,
    };
    state.sessions.unshift(session);
    state.blocks = state.blocks.map((item) => item.id === blockId ? { ...item, status: "running" } : item);
    return session;
  }
  if (!active || active.planBlockId !== blockId) throw new Error("No existe una sesión activa para este bloque.");
  if (transition === "pause" && active.status !== "running") throw new Error("La sesión debe estar en curso para pausarla.");
  if (transition === "resume" && active.status !== "paused") throw new Error("La sesión debe estar pausada para reanudarla.");
  const status = transition === "pause" ? "paused" : transition === "resume" ? "running" : transition === "complete" ? "completed" : "cancelled";
  const session: PomodoroSession = {
    ...active, status, elapsedSeconds: elapsedSessionSeconds(active, now.getTime()),
    lastResumedAt: status === "running" ? timestamp : active.lastResumedAt,
    endedAt: status === "completed" || status === "cancelled" ? timestamp : null,
  };
  state.sessions = state.sessions.map((item) => item.id === session.id ? session : item);
  state.blocks = state.blocks.map((item) => item.id === blockId ? { ...item, status } : item);
  if (state.blocks.every((item) => item.status === "completed")) state.plan = { ...state.plan, status: "completed" };
  return session;
}
