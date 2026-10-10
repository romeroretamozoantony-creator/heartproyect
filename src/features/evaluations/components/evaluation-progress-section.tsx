import { FileText, Medal, ShieldAlert, Sparkles } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  EVALUATION_SCALE,
} from "@/features/evaluations/lib/evaluation-scale";
import type {
  EvaluationLevel,
  EvaluationProgressItem,
  EvaluationStatus,
} from "@/features/evaluations/types/evaluation";

const STATUS_LABELS: Record<EvaluationStatus, string> = {
  not_requested: "Preparada para evaluación",
  pending: "Evaluación solicitada",
  generating: "Preparando evaluación",
  ready: "Lista para comenzar",
  in_progress: "En progreso",
  completed: "Evaluación completada",
  failed: "No se pudo preparar",
};

const LEVEL_STYLES: Record<EvaluationLevel, string> = {
  needs_reinforcement: "border-amber-300 bg-amber-50 text-amber-950",
  satisfactory: "border-sky-300 bg-sky-50 text-sky-950",
  outstanding: "border-emerald-300 bg-emerald-50 text-emerald-950",
};

export function EvaluationProgressSection({
  evaluations,
}: Readonly<{ evaluations: readonly EvaluationProgressItem[] }>) {
  return (
    <section aria-labelledby="evaluation-title" className="space-y-4">
      <div>
        <h2 id="evaluation-title" className="text-xl font-semibold">
          Evaluación del aprendizaje
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Escala preparada para actividades académicas que tengan un archivo
          de estudio asociado.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {EVALUATION_SCALE.map((item) => {
          const Icon =
            item.level === "needs_reinforcement"
              ? ShieldAlert
              : item.level === "satisfactory"
                ? Medal
                : Sparkles;

          return (
            <div
              className={`rounded-xl border p-4 ${LEVEL_STYLES[item.level]}`}
              key={item.level}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">{item.label}</span>
                <Icon aria-hidden="true" className="size-5" />
              </div>
              <p className="mt-2 text-2xl font-semibold">
                {item.minimum}–{item.maximum}
              </p>
              <p className="mt-2 text-sm opacity-80">{item.description}</p>
            </div>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Actividades con material de estudio</CardTitle>
          <CardDescription>
            Aquí aparecerán únicamente calificaciones reales. Mobile Heart no
            genera ni simula evaluaciones en esta etapa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {evaluations.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Todavía no hay actividades académicas con archivos disponibles.
            </p>
          ) : (
            <div className="divide-y">
              {evaluations.map((evaluation) => (
                <article
                  className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  key={evaluation.fileId}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="rounded-lg bg-muted p-2">
                      <FileText
                        aria-hidden="true"
                        className="size-5 text-muted-foreground"
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium">{evaluation.activityTitle}</h3>
                      <p className="truncate text-sm text-muted-foreground">
                        {evaluation.fileName}
                      </p>
                      <p className="mt-1 text-sm">
                        {STATUS_LABELS[evaluation.status]}
                      </p>
                      {evaluation.feedback ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {evaluation.feedback}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {evaluation.score !== null && evaluation.level ? (
                    <div
                      className={`shrink-0 rounded-lg border px-4 py-2 text-center ${LEVEL_STYLES[evaluation.level]}`}
                    >
                      <p className="text-2xl font-semibold">
                        {evaluation.score}/20
                      </p>
                      <p className="text-xs font-medium">
                        {
                          EVALUATION_SCALE.find(
                            (item) => item.level === evaluation.level,
                          )?.label
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="shrink-0 rounded-lg border border-dashed px-4 py-2 text-center text-sm text-muted-foreground">
                      Disponible al integrar IA
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

