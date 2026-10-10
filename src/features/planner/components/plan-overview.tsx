import {
  CalendarDays,
  Clock3,
  Coffee,
  Focus,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlanExecutionPanel } from "@/features/planner/components/plan-execution-panel";
import type {
  PlanBlock,
  StudyPlan,
} from "@/features/planner/types/study-plan";
import type {
  PomodoroSession,
  PomodoroSummary,
} from "@/features/pomodoro/types/pomodoro-session";

type PlanOverviewProps = Readonly<{
  demoMode: boolean;
  activeSession: PomodoroSession | null;
  plan: StudyPlan;
  blocks: readonly PlanBlock[];
  summary: PomodoroSummary;
}>;

function dateKey(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "full",
    timeZone: "America/Lima",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Lima",
  }).format(new Date(value));
}

export function PlanOverview({
  demoMode,
  activeSession,
  blocks,
  plan,
  summary,
}: PlanOverviewProps) {
  const focusMinutes = blocks
    .filter((block) => block.blockType === "study")
    .reduce((total, block) => total + block.plannedMinutes, 0);
  const restMinutes = blocks
    .filter((block) => block.blockType === "break")
    .reduce((total, block) => total + block.plannedMinutes, 0);
  const groups = new Map<string, PlanBlock[]>();

  for (const block of blocks) {
    const key = dateKey(block.scheduledStart);
    groups.set(key, [...(groups.get(key) ?? []), block]);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Concentración</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Focus aria-hidden="true" className="size-5" />
              {focusMinutes} min
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Descanso</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Coffee aria-hidden="true" className="size-5" />
              {restMinutes} min
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Bloques del plan</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Clock3 aria-hidden="true" className="size-5" />
              {blocks.length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Alert>
        <AlertDescription>
          Este plan se generó con TypeScript usando sesiones de concentración de
          hasta 25 minutos y descansos de 5 minutos. No utiliza inteligencia
          artificial.
        </AlertDescription>
      </Alert>

      {blocks.length > 0 ? (
        <div className="space-y-5">
          {[...groups.entries()].map(([key, dayBlocks]) => (
            <Card key={key}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 capitalize">
                  <CalendarDays aria-hidden="true" className="size-5" />
                  {formatDate(dayBlocks[0].scheduledStart)}
                </CardTitle>
                <CardDescription>
                  {dayBlocks.length} bloques planificados
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {dayBlocks.map((block) => {
                  const isStudy = block.blockType === "study";

                  return (
                    <article
                      className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                        isStudy ? "bg-background" : "bg-muted/40"
                      }`}
                      key={block.id}
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="rounded-lg bg-muted p-2">
                          {isStudy ? (
                            <Focus aria-hidden="true" className="size-5" />
                          ) : (
                            <Coffee aria-hidden="true" className="size-5" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium">{block.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {isStudy ? "Concentración" : "Descanso corto"}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-sm sm:text-right">
                        <p className="font-medium">
                          {formatTime(block.scheduledStart)}–
                          {formatTime(block.scheduledEnd)}
                        </p>
                        <p className="text-muted-foreground">
                          {block.plannedMinutes} minutos
                        </p>
                      </div>
                    </article>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Alert variant="destructive">
          <AlertDescription>
            El plan existe, pero todavía no contiene bloques.
          </AlertDescription>
        </Alert>
      )}

      <PlanExecutionPanel
        demoMode={demoMode} key={plan.id}
        activeSession={activeSession}
        blocks={blocks}
        plan={plan}
        summary={summary}
      />
    </div>
  );
}
