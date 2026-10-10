"use client";

import {
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  RotateCcw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  confirmStudyPlan,
  restructureStudyPlan,
  type PlanTransitionResult,
} from "@/features/planner/actions/plan-actions";
import { PLAN_TIME_ZONE } from "@/features/planner/lib/pomodoro-planner";
import type {
  PlanStatus,
  StudyPlan,
} from "@/features/planner/types/study-plan";

type PlanControlsProps = Readonly<{
  plan: StudyPlan;
  onStatusChange?: (status: PlanStatus) => void;
}>;

const STATUS_LABELS: Record<PlanStatus, string> = {
  draft: "Borrador",
  confirmed: "Confirmado",
  restructured: "En reestructuración",
  completed: "Completado",
  cancelled: "Cancelado",
};

function formatConfirmationDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: PLAN_TIME_ZONE,
  }).format(new Date(value));
}

export function PlanControls({ onStatusChange, plan }: PlanControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<PlanStatus>(plan.status);
  const [confirmedAt, setConfirmedAt] = useState(plan.confirmedAt);
  const [result, setResult] = useState<PlanTransitionResult | null>(null);
  const [showRestructureConfirmation, setShowRestructureConfirmation] =
    useState(false);

  const canConfirm = status === "draft";
  const canRestructure = status === "draft" || status === "confirmed";

  function confirmPlan() {
    setResult(null);
    startTransition(async () => {
      const nextResult = await confirmStudyPlan(plan.id);
      setResult(nextResult);

      if (nextResult.status === "success") {
        setStatus(nextResult.planStatus);
        setConfirmedAt(nextResult.confirmedAt);
        onStatusChange?.(nextResult.planStatus);
        router.refresh();
      }
    });
  }

  function restructurePlan() {
    setResult(null);
    startTransition(async () => {
      const nextResult = await restructureStudyPlan(plan.id);
      setResult(nextResult);

      if (nextResult.status === "success") {
        setStatus(nextResult.planStatus);
        setConfirmedAt(nextResult.confirmedAt);
        onStatusChange?.(nextResult.planStatus);
        router.push("/schedule");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{plan.name}</CardTitle>
        <CardDescription>
          Estado actual: {STATUS_LABELS[status].toLocaleLowerCase("es-PE")}.
          {status === "draft"
            ? " Revisa la distribución antes de confirmarla."
            : null}
          {status === "confirmed" && confirmedAt
            ? ` Confirmado el ${formatConfirmationDate(confirmedAt)}.`
            : null}
          {status === "restructured"
            ? " Ajusta el cronograma y vuelve a generar el plan."
            : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {result ? (
          <Alert
            aria-live="polite"
            variant={result.status === "error" ? "destructive" : "default"}
          >
            {result.status === "error" ? (
              <CircleAlert aria-hidden="true" />
            ) : (
              <CheckCircle2 aria-hidden="true" />
            )}
            <AlertTitle>
              {result.status === "error" ? "No se pudo actualizar" : "Listo"}
            </AlertTitle>
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        ) : null}

        {showRestructureConfirmation ? (
          <Alert>
            <CircleAlert aria-hidden="true" />
            <AlertTitle>¿Reestructurar este plan?</AlertTitle>
            <AlertDescription>
              Volverás al cronograma para ajustar días u horarios y generar una
              nueva distribución.
            </AlertDescription>
            <div className="col-start-2 mt-3 flex flex-wrap gap-2">
              <Button
                disabled={isPending}
                type="button"
                variant="outline"
                onClick={() => setShowRestructureConfirmation(false)}
              >
                Cancelar
              </Button>
              <Button
                disabled={isPending}
                type="button"
                variant="destructive"
                onClick={restructurePlan}
              >
                {isPending ? (
                  <LoaderCircle aria-hidden="true" className="animate-spin" />
                ) : (
                  <RotateCcw aria-hidden="true" />
                )}
                {isPending ? "Actualizando..." : "Sí, reestructurar"}
              </Button>
            </div>
          </Alert>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              disabled={!canRestructure || isPending}
              size="lg"
              type="button"
              variant="outline"
              onClick={() => {
                setResult(null);
                setShowRestructureConfirmation(true);
              }}
            >
              <RotateCcw aria-hidden="true" />
              Reestructurar plan
            </Button>
            <Button
              disabled={!canConfirm || isPending}
              size="lg"
              type="button"
              onClick={confirmPlan}
            >
              {isPending ? (
                <LoaderCircle aria-hidden="true" className="animate-spin" />
              ) : (
                <CheckCircle2 aria-hidden="true" />
              )}
              {status === "confirmed"
                ? "Plan confirmado"
                : isPending
                  ? "Confirmando..."
                  : "Confirmar plan"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
