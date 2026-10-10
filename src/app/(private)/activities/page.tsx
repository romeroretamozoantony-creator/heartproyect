import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { ActivityWorkspace } from "@/features/activities/components/activity-workspace";
import { getActivities } from "@/features/activities/data/activity-queries";

export const metadata: Metadata = {
  title: "Actividades | Mobile Heart",
  description: "Organiza tus actividades académicas, laborales y personales.",
};

async function ActivitiesContent() {
  await connection();
  const result = await getActivities();

  return (
    <>
      {result.error ? (
        <Alert variant="destructive">
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      ) : null}
      <ActivityWorkspace initialActivities={result.activities} />
    </>
  );
}

function ActivitiesLoading() {
  return (
    <div className="rounded-xl border border-dashed px-5 py-12 text-center text-sm text-muted-foreground">
      Cargando tus actividades...
    </div>
  );
}

export default function ActivitiesPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-muted-foreground">
          Organización diaria
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Registro de actividades
        </h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Registra tus responsabilidades para identificar cómo se distribuye tu
          tiempo entre estudio, trabajo y actividades personales.
        </p>
      </header>

      <Suspense fallback={<ActivitiesLoading />}>
        <ActivitiesContent />
      </Suspense>
    </div>
  );
}
