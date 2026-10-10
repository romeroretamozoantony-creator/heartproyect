import { isDemoMode } from "@/features/demo/mode";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { getActivities } from "@/features/activities/data/activity-queries";
import { getUploadedFiles } from "@/features/files/data/uploaded-file-queries";
import { ScheduleWorkspace } from "@/features/schedule/components/schedule-workspace";
import { getActivitySchedules } from "@/features/schedule/data/schedule-queries";

export const metadata: Metadata = {
  title: "Cronograma | Mobile Heart",
  description: "Distribuye tus actividades y tiempos disponibles por semana.",
};

async function ScheduleContent() {
  await connection();
  const [routinesResult, schedulesResult, filesResult] = await Promise.all([
    getActivities("rutina"),
    getActivitySchedules(),
    getUploadedFiles(),
  ]);

  return (
    <>
      {routinesResult.error ? (
        <Alert className="mb-6" variant="destructive">
          <AlertDescription>{routinesResult.error}</AlertDescription>
        </Alert>
      ) : null}
      {schedulesResult.error ? (
        <Alert className="mb-6" variant="destructive">
          <AlertDescription>{schedulesResult.error}</AlertDescription>
        </Alert>
      ) : null}
      {filesResult.error ? (
        <Alert className="mb-6" variant="destructive">
          <AlertDescription>{filesResult.error}</AlertDescription>
        </Alert>
      ) : null}
      <ScheduleWorkspace
        demoMode={isDemoMode()}
        routines={routinesResult.activities}
        initialFiles={filesResult.files}
        initialSchedules={schedulesResult.schedules}
      />
    </>
  );
}

function ScheduleLoading() {
  return (
    <div className="rounded-xl border border-dashed px-5 py-12 text-center text-sm text-muted-foreground">
      Cargando tus actividades...
    </div>
  );
}

export default function SchedulePage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-muted-foreground">
          Organización semanal
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Cronograma y tiempo disponible
        </h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Selecciona los días en los que deseas trabajar cada actividad, asigna
          el tiempo disponible y configura recordatorios básicos.
        </p>
      </header>

      <Suspense fallback={<ScheduleLoading />}>
        <ScheduleContent />
      </Suspense>
    </div>
  );
}
