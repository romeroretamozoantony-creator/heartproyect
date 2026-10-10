"use client";

import {
  CalendarDays,
  ClipboardList,
  Clock3,
  LoaderCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ActivityForm } from "@/features/activities/components/activity-form";
import { deleteActivity } from "@/features/activities/actions/activity-actions";
import { ActivityCalendar } from "@/features/activities/components/activity-calendar";
import type { ActivityFormValues } from "@/features/activities/schemas/activity-schema";
import type { Activity } from "@/features/activities/types/activity";

const CATEGORY_LABELS: Record<ActivityFormValues["category"], string> = {
  academic: "Académica",
  work: "Laboral",
  personal: "Personal",
};

const PRIORITY_LABELS: Record<ActivityFormValues["priority"], string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "long",
  }).format(new Date(`${value}T00:00:00`));
}

function sortActivities(activities: Activity[]) {
  return activities.sort((first, second) =>
    `${first.activityDate}${first.startTime}`.localeCompare(
      `${second.activityDate}${second.startTime}`,
    ),
  );
}

type ActivityWorkspaceProps = Readonly<{
  initialActivities: readonly Activity[];
}>;

export function ActivityWorkspace({
  initialActivities,
}: ActivityWorkspaceProps) {
  const [preview, setPreview] = useState<ActivityFormValues | null>(null);
  const [activities, setActivities] = useState<Activity[]>([
    ...initialActivities,
  ]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [calendarFocus, setCalendarFocus] = useState<{
    date?: string;
    version: number;
  }>({ version: 0 });
  const [actionResult, setActionResult] = useState<{
    status: "error" | "success";
    message: string;
  } | null>(null);

  function focusCalendar(date: string) {
    setCalendarFocus((current) => ({
      date,
      version: current.version + 1,
    }));
  }

  function previewActivity(activity: ActivityFormValues) {
    setPreview(activity);
    focusCalendar(activity.activityDate);
  }

  function addActivity(activity: Activity) {
    setActivities((current) => sortActivities([...current, activity]));
    focusCalendar(activity.activityDate);
  }

  function updateSavedActivity(activity: Activity) {
    setActivities((current) =>
      sortActivities(
        current.map((item) => (item.id === activity.id ? activity : item)),
      ),
    );
    setPreview(null);
    focusCalendar(activity.activityDate);
    setEditingId(null);
    setActionResult({
      status: "success",
      message: "Actividad actualizada correctamente.",
    });
  }

  async function removeActivity(activityId: string) {
    setDeletingId(activityId);
    setActionResult(null);

    const result = await deleteActivity(activityId);
    setActionResult(result);

    if (result.status === "success") {
      setActivities((current) =>
        current.filter((activity) => activity.id !== activityId),
      );
      setPendingDeleteId(null);
      setEditingId((current) => (current === activityId ? null : current));
    }

    setDeletingId(null);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Registrar actividad</CardTitle>
            <CardDescription>
              Completa los datos para preparar su ubicación en tu agenda.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityForm onCreated={addActivity} onPreview={previewActivity} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays aria-hidden="true" className="size-5" />
              Calendario de actividades
            </CardTitle>
            <CardDescription>
              Consulta tus actividades por fecha y revisa nuevos horarios antes
              de continuar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityCalendar
              activities={activities}
              focusDate={calendarFocus.date}
              key={calendarFocus.version}
              preview={preview}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList aria-hidden="true" className="size-5" />
            Actividades registradas
          </CardTitle>
          <CardDescription>
            Actividades guardadas en tu cuenta de Supabase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {actionResult ? (
            <Alert
              className="mb-4"
              variant={
                actionResult.status === "error" ? "destructive" : "default"
              }
            >
              <AlertDescription>{actionResult.message}</AlertDescription>
            </Alert>
          ) : null}

          {activities.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {activities.map((activity) => {
                const isPendingDelete = pendingDeleteId === activity.id;
                const isDeleting = deletingId === activity.id;

                if (editingId === activity.id) {
                  return (
                    <section
                      className="rounded-xl border bg-muted/30 p-4 md:col-span-2 xl:col-span-3"
                      key={activity.id}
                    >
                      <div className="mb-4">
                        <h2 className="font-semibold">Editar actividad</h2>
                        <p className="text-sm text-muted-foreground">
                          Modifica los datos y guarda los cambios.
                        </p>
                      </div>
                      <ActivityForm
                        activity={activity}
                        mode="edit"
                        onCancel={() => setEditingId(null)}
                        onUpdated={updateSavedActivity}
                      />
                    </section>
                  );
                }

                return (
                  <article className="rounded-xl border p-4" key={activity.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                          {CATEGORY_LABELS[activity.category]}
                        </p>
                        <h2 className="mt-1 truncate font-semibold">
                          {activity.title}
                        </h2>
                      </div>
                      <span className="shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium">
                        {PRIORITY_LABELS[activity.priority]}
                      </span>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                      <p className="flex items-center gap-2">
                        <CalendarDays aria-hidden="true" className="size-4" />
                        {formatDate(activity.activityDate)}
                      </p>
                      <p className="flex items-center gap-2">
                        <Clock3 aria-hidden="true" className="size-4" />
                        {activity.startTime} a {activity.endTime}
                      </p>
                    </div>

                    {isPendingDelete ? (
                      <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                        <p className="text-sm font-medium">
                          ¿Eliminar esta actividad?
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Se eliminarán también sus archivos, su cronograma, sus bloques del plan, sus sesiones y su progreso. Esta acción no se puede deshacer.
                        </p>
                        <div className="mt-3 flex justify-end gap-2">
                          <Button
                            disabled={isDeleting}
                            size="sm"
                            type="button"
                            variant="outline"
                            onClick={() => setPendingDeleteId(null)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            disabled={isDeleting}
                            size="sm"
                            type="button"
                            variant="destructive"
                            onClick={() => removeActivity(activity.id)}
                          >
                            {isDeleting ? (
                              <LoaderCircle
                                aria-hidden="true"
                                className="animate-spin"
                              />
                            ) : (
                              <Trash2 aria-hidden="true" />
                            )}
                            {isDeleting ? "Eliminando..." : "Eliminar"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 flex justify-end gap-2 border-t pt-3">
                        <Button
                          size="sm"
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setActionResult(null);
                            setPendingDeleteId(null);
                            setEditingId(activity.id);
                          }}
                        >
                          <Pencil aria-hidden="true" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          type="button"
                          variant="destructive"
                          onClick={() => {
                            setActionResult(null);
                            setPendingDeleteId(activity.id);
                          }}
                        >
                          <Trash2 aria-hidden="true" />
                          Eliminar
                        </Button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed px-5 py-8 text-center text-sm text-muted-foreground">
              Todavía no hay actividades guardadas.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
