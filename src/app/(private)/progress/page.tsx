import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProgressDashboard } from "@/features/progress/components/progress-dashboard";
import { getProgressOverview } from "@/features/progress/data/progress-queries";

export const metadata: Metadata = {
  title: "Progreso | Mobile Heart",
  description:
    "Consulta el cumplimiento de tus actividades y sesiones Pomodoro.",
};

async function ProgressContent() {
  await connection();
  const result = await getProgressOverview();

  return (
    <>
      {result.error ? (
        <Alert variant="destructive">
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      ) : null}
      <ProgressDashboard overview={result.overview} />
    </>
  );
}

function ProgressLoading() {
  return (
    <div className="rounded-xl border border-dashed px-5 py-12 text-center text-sm text-muted-foreground">
      Calculando tus resultados...
    </div>
  );
}

export default function ProgressPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-muted-foreground">
          Seguimiento personal
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Progreso y resultados
        </h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Revisa cuánto has avanzado, compara el tiempo planificado con el
          tiempo realizado y reconoce tus actividades completadas.
        </p>
      </header>

      <Suspense fallback={<ProgressLoading />}>
        <ProgressContent />
      </Suspense>
    </div>
  );
}

