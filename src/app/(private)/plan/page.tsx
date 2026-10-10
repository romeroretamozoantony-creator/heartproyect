import { isDemoMode } from "@/features/demo/mode";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlanOverview } from "@/features/planner/components/plan-overview";
import { getLatestStudyPlan } from "@/features/planner/data/plan-queries";

export const metadata: Metadata = {
  title: "Plan de estudio | Mobile Heart",
  description: "Revisa tu plan de concentración y descansos Pomodoro.",
};

async function PlanContent() {
  await connection();
  const result = await getLatestStudyPlan();

  if (result.error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{result.error}</AlertDescription>
      </Alert>
    );
  }

  if (!result.plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Todavía no tienes un plan</CardTitle>
          <CardDescription>
            Guarda tu cronograma semanal y utiliza la opción Diseñar plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button nativeButton={false} render={<Link href="/schedule" />}>
            Ir al cronograma
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <PlanOverview
        demoMode={isDemoMode()}
      activeSession={result.activeSession}
      blocks={result.blocks}
      plan={result.plan}
      summary={result.summary}
    />
  );
}

function PlanLoading() {
  return (
    <div className="rounded-xl border border-dashed px-5 py-12 text-center text-sm text-muted-foreground">
      Cargando tu plan de estudio...
    </div>
  );
}

export default function PlanPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-muted-foreground">
          Metodología Pomodoro
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Plan de estudio
        </h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Revisa las sesiones de concentración y los descansos calculados a
          partir de tu cronograma semanal.
        </p>
      </header>

      <Suspense fallback={<PlanLoading />}>
        <PlanContent />
      </Suspense>
    </div>
  );
}
