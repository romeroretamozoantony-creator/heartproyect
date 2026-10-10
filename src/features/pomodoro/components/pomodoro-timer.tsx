"use client";

import {
  Ban,
  BarChart3,
  CheckCircle2,
  Clock3,
  Coffee,
  Focus,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { elapsedSessionSeconds } from "@/features/pomodoro/lib/session-clock";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PlanBlock } from "@/features/planner/types/study-plan";
import { transitionPomodoroSession } from "@/features/pomodoro/actions/session-actions";
import type {
  PomodoroSession,
  PomodoroSummary,
  PomodoroTransition,
} from "@/features/pomodoro/types/pomodoro-session";

type TimerStatus = "idle" | "running" | "paused" | "finished" | "cancelled";

type PomodoroTimerProps = Readonly<{
  demoMode: boolean;
  blocks: readonly PlanBlock[];
  enabled: boolean;
  initialSession: PomodoroSession | null;
  planId: string;
  summary: PomodoroSummary;
}>;

const STATUS_LABELS: Record<TimerStatus, string> = {
  idle: "Listo para iniciar",
  running: "Sesión en curso",
  paused: "Sesión pausada",
  finished: "Bloque completado",
  cancelled: "Bloque cancelado",
};

function formatSeconds(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatDuration(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;

  if (minutes === 0) {
    return `${seconds} s`;
  }

  return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds} s`;
}

function getRemainingSeconds(session: PomodoroSession | null, fallback: number) {
  if (!session) {
    return fallback;
  }

  return Math.max(0, session.plannedSeconds - elapsedSessionSeconds(session));
}

export function PomodoroTimer({
  demoMode,
  blocks,
  enabled,
  initialSession,
  summary,
}: PomodoroTimerProps) {
  const sessionBlockIndex = initialSession
    ? blocks.findIndex((block) => block.id === initialSession.planBlockId)
    : -1;
  const firstPendingIndex = blocks.findIndex(
    (block) => block.status !== "completed" && block.status !== "cancelled",
  );
  const firstCancelledIndex = blocks.findIndex((block) => block.status === "cancelled");
  const initialIndex =
    sessionBlockIndex >= 0
      ? sessionBlockIndex
      : firstPendingIndex >= 0
        ? firstPendingIndex
        : firstCancelledIndex >= 0 ? firstCancelledIndex : 0;
  const initialBlock = blocks[initialIndex];
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [session, setSession] = useState(initialSession);
  const [status, setStatus] = useState<TimerStatus>(
    initialSession?.status === "running" || initialSession?.status === "paused"
      ? initialSession.status
      : firstPendingIndex < 0 ? (firstCancelledIndex >= 0 ? "cancelled" : "finished") : "idle",
  );
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    getRemainingSeconds(
      initialSession,
      initialBlock && (firstPendingIndex >= 0 || firstCancelledIndex >= 0) ? initialBlock.plannedMinutes * 60 : 0,
    ),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedBlocks, setCompletedBlocks] = useState(
    summary.completedBlocks,
  );
  const [focusSeconds, setFocusSeconds] = useState(summary.focusSeconds);
  const [restSeconds, setRestSeconds] = useState(summary.restSeconds);
  const activeBlock = blocks[activeIndex];
  const transitionLock = useRef(false);
  const plannedSeconds = activeBlock ? activeBlock.plannedMinutes * 60 : 0;

  const performTransition = useCallback(async (transition: PomodoroTransition, nextStatus: TimerStatus) => {
    if (!activeBlock || transitionLock.current) return false;
    transitionLock.current = true;
    setError(null);
    setIsSaving(true);
    try {
      const result = await transitionPomodoroSession(activeBlock.id, transition);
      if (result.status === "error" || !result.session) {
        setError(result.status === "error" ? result.message : "No se recuperó la sesión guardada.");
        // Una finalización fallida permanece pausada, lista para reintentar.
        if (transition === "complete") setStatus("paused");
        return false;
      }
      setSession(result.session);
      setRemainingSeconds(getRemainingSeconds(result.session, plannedSeconds));
      setStatus(nextStatus);
      if (transition === "complete") {
        setCompletedBlocks((current) => Math.min(blocks.length, current + 1));
        if (result.session.sessionType === "rest") setRestSeconds((current) => current + result.session!.elapsedSeconds);
        else setFocusSeconds((current) => current + result.session!.elapsedSeconds);
        setRemainingSeconds(0);
      }
      return true;
    } catch {
      setError("No se pudo guardar la sesión. Reintenta la operación.");
      if (transition === "complete") setStatus("paused");
      return false;
    } finally {
      transitionLock.current = false;
      setIsSaving(false);
    }
  }, [activeBlock, blocks.length, plannedSeconds]);

  useEffect(() => {
    if (status !== "running" || !session) return;
    const intervalId = window.setInterval(() => {
      const remaining = getRemainingSeconds(session, plannedSeconds);
      setRemainingSeconds(remaining);
      if (remaining === 0) void performTransition("complete", "finished");
    }, 250);
    return () => window.clearInterval(intervalId);
  }, [performTransition, plannedSeconds, session, status]);



  if (!activeBlock) return null;
  const isRest = activeBlock.blockType === "break";
  const elapsedSeconds = Math.max(0, plannedSeconds - remainingSeconds);
  const progress = plannedSeconds > 0 ? Math.min(100, Math.round(elapsedSeconds / plannedSeconds * 100)) : 0;
  const nextPendingIndex = blocks.findIndex((block, index) => index > activeIndex && block.status !== "completed" && block.status !== "cancelled");
  const hasNextBlock = nextPendingIndex >= 0;
  const completionPercentage = blocks.length > 0 ? Math.round(completedBlocks / blocks.length * 100) : 0;

  function resetCurrentBlock() {
    setSession(null);
    setRemainingSeconds(activeBlock.plannedMinutes * 60);
    setStatus("idle");
    setError(null);
  }

  function goToNextBlock() {
    if (!hasNextBlock) {
      return;
    }

    const nextIndex = nextPendingIndex;
    setActiveIndex(nextIndex);
    setSession(null);
    setRemainingSeconds(blocks[nextIndex].plannedMinutes * 60);
    setStatus("idle");
    setError(null);
  }

  async function completeCurrentBlock() {
    await performTransition("complete", "finished");
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-muted p-2.5">
            {isRest ? (
              <Coffee aria-hidden="true" className="size-5" />
            ) : (
              <Focus aria-hidden="true" className="size-5" />
            )}
          </span>
          <div>
            <CardTitle>Temporizador Pomodoro</CardTitle>
            <CardDescription className="mt-1">
              Bloque {activeIndex + 1} de {blocks.length}: {activeBlock.title}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border bg-background p-4">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <BarChart3 aria-hidden="true" className="size-4" />
              Avance del plan
            </p>
            <p className="mt-2 text-xl font-semibold">
              {completedBlocks}/{blocks.length} bloques
            </p>
            <p className="text-xs text-muted-foreground">
              {completionPercentage}% completado
            </p>
          </div>
          <div className="rounded-xl border bg-background p-4">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Focus aria-hidden="true" className="size-4" />
              Concentración real
            </p>
            <p className="mt-2 text-xl font-semibold">
              {formatDuration(focusSeconds)}
            </p>
          </div>
          <div className="rounded-xl border bg-background p-4">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock3 aria-hidden="true" className="size-4" />
              Descanso real
            </p>
            <p className="mt-2 text-xl font-semibold">
              {formatDuration(restSeconds)}
            </p>
          </div>
        </div>

        {!enabled && status !== "finished" ? (
          <Alert>
            <AlertTitle>Confirma el plan para comenzar</AlertTitle>
            <AlertDescription>
              El temporizador se habilitará cuando aceptes la distribución de
              sesiones y descansos.
            </AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert aria-live="polite" variant="destructive">
            <AlertTitle>No se pudo guardar la sesión</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="rounded-2xl border bg-muted/20 px-5 py-8 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            {isRest ? "Descanso corto" : "Concentración"}
          </p>
          <p
            aria-label={`${Math.floor(remainingSeconds / 60)} minutos y ${remainingSeconds % 60} segundos restantes`}
            className="mt-2 font-mono text-5xl font-semibold tabular-nums sm:text-6xl"
          >
            {formatSeconds(remainingSeconds)}
          </p>
          <p aria-live="polite" className="mt-3 text-sm text-muted-foreground">
            {STATUS_LABELS[status]}
          </p>
          <div
            aria-label={`Progreso del bloque: ${progress}%`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={progress}
            className="mt-6 h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {status === "finished" ? (
          <Alert>
            <CheckCircle2 aria-hidden="true" />
            <AlertTitle>
              {demoMode ? "Bloque completado" : "Bloque completado y registrado"}
            </AlertTitle>
            <AlertDescription>
              {hasNextBlock
                ? "Puedes continuar con el siguiente bloque del plan."
                : "Completaste todos los bloques disponibles del plan."}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-wrap justify-center gap-2">
          {status === "idle" ? (
            <Button
              disabled={!enabled || isSaving}
              size="lg"
              type="button"
              onClick={() => performTransition("start", "running")}
            >
              {isSaving ? (
                <LoaderCircle aria-hidden="true" className="animate-spin" />
              ) : (
                <Play aria-hidden="true" />
              )}
              {isSaving ? "Guardando..." : "Iniciar"}
            </Button>
          ) : null}

          {status === "running" ? (
            <Button
              disabled={isSaving}
              size="lg"
              type="button"
              onClick={() => performTransition("pause", "paused")}
            >
              <Pause aria-hidden="true" />
              Pausar
            </Button>
          ) : null}

          {status === "paused" ? (
            <Button
              disabled={isSaving}
              size="lg"
              type="button"
              onClick={() => performTransition("resume", "running")}
            >
              <Play aria-hidden="true" />
              Reanudar
            </Button>
          ) : null}

          {status === "running" || status === "paused" ? (
            <>
              <Button
                disabled={isSaving}
                type="button"
                variant="outline"
                onClick={completeCurrentBlock}
              >
                <CheckCircle2 aria-hidden="true" />
                Completar ahora
              </Button>
              <Button
                disabled={isSaving}
                type="button"
                variant="destructive"
                onClick={() => performTransition("cancel", "cancelled")}
              >
                <Ban aria-hidden="true" />
                Cancelar
              </Button>
            </>
          ) : null}

          {status === "cancelled" ? (
            <Button type="button" variant="outline" onClick={resetCurrentBlock}>
              <RotateCcw aria-hidden="true" />
              Reiniciar bloque
            </Button>
          ) : null}

          {(status === "finished" || status === "cancelled") && hasNextBlock ? (
            <Button size="lg" type="button" onClick={goToNextBlock}>
              <SkipForward aria-hidden="true" />
              Siguiente bloque
            </Button>
          ) : null}
        </div>

        <Link className={buttonVariants({ variant: "outline" })} href="/progress">
          Consultar progreso
        </Link>

        <p className="text-center text-xs text-muted-foreground">
          {demoMode
            ? "Modo demostración local: el avance se conserva durante esta sesión."
            : session
              ? "La sesión y el tiempo transcurrido están sincronizados con Supabase."
              : "La sesión se guardará en Supabase al iniciarla."}
        </p>
      </CardContent>
    </Card>
  );
}
