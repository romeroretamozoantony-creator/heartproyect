"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Bell,
  CircleCheck,
  Clock3,
  Save,
} from "lucide-react";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  saveActivitySchedules,
  type SaveScheduleResult,
} from "@/features/schedule/actions/schedule-actions";
import { createScheduleDays } from "@/features/schedule/lib/schedule-defaults";
import {
  WEEKDAYS,
  weeklyScheduleSchema,
  type ScheduleDayValues,
  type WeeklyScheduleFormValues,
} from "@/features/schedule/schemas/weekly-schedule-schema";
import type { ActivitySchedule } from "@/features/schedule/types/activity-schedule";
import type { Activity } from "@/features/activities/types/activity";
import { DayFileUpload } from "@/features/files/components/day-file-upload";
import type { UploadedFile } from "@/features/files/types/uploaded-file";
import { GeneratePlanButton } from "@/features/planner/components/generate-plan-button";

const ALERT_OPTIONS = [5, 10, 15, 30, 60] as const;

type ScheduleWorkspaceProps = Readonly<{
  demoMode: boolean;
  routines: readonly Activity[];
  initialFiles: readonly UploadedFile[];
  initialSchedules: readonly ActivitySchedule[];
}>;

function activityTitle(activityId: string, routines: readonly Activity[]) {
  return (
    routines.find((routine) => routine.id === activityId)?.title ??
    "Opción no disponible"
  );
}

export function ScheduleWorkspace({
  demoMode,
  routines,
  initialFiles,
  initialSchedules,
}: ScheduleWorkspaceProps) {
  const initialDays = createScheduleDays(initialSchedules);
  const [preview, setPreview] = useState<ScheduleDayValues[] | null>(
    initialSchedules.length > 0
      ? initialDays.filter((day) => day.enabled)
      : null,
  );
  const [result, setResult] = useState<SaveScheduleResult | null>(null);
  const {
    control,
    handleSubmit,
    register,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<WeeklyScheduleFormValues>({
    resolver: zodResolver(weeklyScheduleSchema),
    defaultValues: { days: initialDays },
    mode: "onBlur",
  });
  const days = useWatch({ control, name: "days" });
  const [files, setFiles] = useState<UploadedFile[]>([...initialFiles]);

  async function saveSchedule(values: WeeklyScheduleFormValues) {
    setResult(null);
    const nextResult = await saveActivitySchedules(values);
    setResult(nextResult);

    if (nextResult.status === "success") {
      const savedDays = createScheduleDays(nextResult.schedules);
      reset({ days: savedDays });
      setPreview(savedDays.filter((day) => day.enabled));
    }
  }

  if (routines.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No hay opciones de rutina disponibles</CardTitle>
          <CardDescription>
            Vuelve a cargar la página. Si el problema continúa, revisa tu sesión.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <form
        className="space-y-6"
        noValidate
        onSubmit={handleSubmit(saveSchedule)}
      >
        <Card>
        <CardHeader>
          <CardTitle>Configuración semanal</CardTitle>
          <CardDescription>
            Activa los días que deseas utilizar y asigna una actividad con su
            tiempo disponible.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {WEEKDAYS.map((weekday, index) => {
            const enabled = days[index]?.enabled ?? false;
            const fieldPrefix = `schedule-${index}`;
            const dayError = errors.days?.[index];

            return (
              <fieldset
                className={`rounded-xl border p-4 transition-colors ${
                  enabled ? "bg-muted/30" : "bg-background"
                }`}
                key={weekday}
              >
                <legend className="sr-only">Configuración para {weekday}</legend>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label
                    className="flex cursor-pointer items-center gap-3 font-medium"
                    htmlFor={`${fieldPrefix}-enabled`}
                  >
                    <input
                      {...register(`days.${index}.enabled`)}
                      className="size-4 accent-primary"
                      id={`${fieldPrefix}-enabled`}
                      type="checkbox"
                    />
                    {weekday}
                  </label>
                  <span className="text-xs text-muted-foreground">
                    {enabled ? "Día incluido" : "Día libre"}
                  </span>
                </div>

                <input
                  {...register(`days.${index}.dayOfWeek`, {
                    valueAsNumber: true,
                  })}
                  type="hidden"
                />

                <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-2 md:col-span-2 xl:col-span-1">
                    <Label htmlFor={`${fieldPrefix}-activity`}>Actividad</Label>
                    <Controller
                      control={control}
                      name={`days.${index}.activityId`}
                      render={({ field }) => (
                        <Select
                          disabled={!enabled}
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger
                            aria-describedby={
                              dayError?.activityId
                                ? `${fieldPrefix}-activity-error`
                                : undefined
                            }
                            aria-invalid={Boolean(dayError?.activityId)}
                            className="w-full"
                            id={`${fieldPrefix}-activity`}
                          >
                            <SelectValue placeholder="Selecciona una actividad">
                              {(value: string | null) =>
                                value
                                  ? activityTitle(value, routines)
                                  : "Selecciona una actividad"
                              }
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {routines.map((routine) => (
                              <SelectItem key={routine.id} value={routine.id}>
                                {routine.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {dayError?.activityId ? (
                      <p
                        className="text-sm text-destructive"
                        id={`${fieldPrefix}-activity-error`}
                        role="alert"
                      >
                        {dayError.activityId.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`${fieldPrefix}-minutes`}>Tiempo (minutos)</Label>
                    <Input
                      {...register(`days.${index}.allocatedMinutes`, {
                        valueAsNumber: true,
                      })}
                      disabled={!enabled}
                      id={`${fieldPrefix}-minutes`}
                      max={1440}
                      min={1}
                      type="number"
                    />
                    {dayError?.allocatedMinutes ? (
                      <p className="text-sm text-destructive" role="alert">
                        {dayError.allocatedMinutes.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`${fieldPrefix}-start`}>Hora de inicio</Label>
                    <Input
                      {...register(`days.${index}.startTime`)}
                      aria-invalid={Boolean(dayError?.startTime)}
                      disabled={!enabled}
                      id={`${fieldPrefix}-start`}
                      type="time"
                    />
                    {dayError?.startTime ? (
                      <p className="text-sm text-destructive" role="alert">
                        {dayError.startTime.message}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`${fieldPrefix}-alert`}>Avisar antes</Label>
                    <Controller
                      control={control}
                      name={`days.${index}.alertBeforeStartMinutes`}
                      render={({ field }) => (
                        <Select
                          disabled={!enabled}
                          value={field.value === null ? "none" : String(field.value)}
                          onValueChange={(value) =>
                            field.onChange(value === "none" ? null : Number(value))
                          }
                        >
                          <SelectTrigger className="w-full" id={`${fieldPrefix}-alert`}>
                            <SelectValue>
                              {(value: string | null) =>
                                value && value !== "none"
                                  ? `${value} minutos antes`
                                  : "Sin aviso previo"
                              }
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin aviso previo</SelectItem>
                            {ALERT_OPTIONS.map((minutes) => (
                              <SelectItem key={minutes} value={String(minutes)}>
                                {minutes} minutos antes
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="flex items-end pb-2">
                    <label
                      className="flex cursor-pointer items-center gap-3 text-sm"
                      htmlFor={`${fieldPrefix}-alert-end`}
                    >
                      <input
                        {...register(`days.${index}.alertOnEnd`)}
                        className="size-4 accent-primary"
                        disabled={!enabled}
                        id={`${fieldPrefix}-alert-end`}
                        type="checkbox"
                      />
                      Avisar al terminar
                    </label>
                  </div>
                </div>

                <DayFileUpload
                  activityId={enabled ? (days[index]?.activityId ?? "") : ""}
                  demoMode={demoMode}
                  disabled={!enabled}
                  files={files.filter((file) => file.activityId === days[index]?.activityId)}
                  onDeleted={(fileId) =>
                    setFiles((current) => current.filter((file) => file.id !== fileId))
                  }
                  onUploaded={(file) => setFiles((current) => [file, ...current])}
                />
                </div>
              </fieldset>
            );
          })}

          {typeof errors.days?.message === "string" ? (
            <p className="text-sm text-destructive" role="alert">
              {errors.days.message}
            </p>
          ) : null}
        </CardContent>
        </Card>

        {result ? (
          <Alert variant={result.status === "error" ? "destructive" : "default"}>
            {result.status === "success" ? (
              <CircleCheck aria-hidden="true" />
            ) : null}
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex justify-end">
          <Button disabled={isSubmitting} size="lg" type="submit">
            <Save aria-hidden="true" />
            {isSubmitting ? "Guardando..." : "Guardar cronograma"}
          </Button>
        </div>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock3 aria-hidden="true" className="size-5" />
            Resumen del cronograma
          </CardTitle>
          <CardDescription>
            Configuración semanal guardada y disponible para diseñar tu plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {preview ? (
            <div className="space-y-3">
              {preview.map((day) => (
                <article
                  className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                  key={day.dayOfWeek}
                >
                  <div>
                    <p className="font-medium">{WEEKDAYS[day.dayOfWeek]}</p>
                    <p className="text-sm text-muted-foreground">
                      {activityTitle(day.activityId, routines)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {day.startTime ? (
                      <span className="rounded-full border px-2.5 py-1">
                        {day.startTime}
                      </span>
                    ) : null}
                    <span className="rounded-full border px-2.5 py-1">
                      {day.allocatedMinutes} minutos
                    </span>
                    <span className="flex items-center gap-1 rounded-full border px-2.5 py-1">
                      <Bell aria-hidden="true" className="size-3" />
                      {day.alertBeforeStartMinutes === null
                        ? "Sin aviso previo"
                        : `${day.alertBeforeStartMinutes} min antes`}
                    </span>
                    {day.alertOnEnd ? (
                      <span className="rounded-full border px-2.5 py-1">
                        Aviso al terminar
                      </span>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed px-5 py-10 text-center text-sm text-muted-foreground">
              Selecciona tus días para visualizar el cronograma semanal.
            </div>
          )}
        </CardContent>
      </Card>

      <Alert>
        <AlertDescription>
          {isDirty
            ? "Guarda los cambios del cronograma antes de diseñar un nuevo plan."
            : "El plan utilizará el cronograma guardado y se creará como borrador."}
        </AlertDescription>
      </Alert>

      <GeneratePlanButton
        disabled={!preview || preview.length === 0 || isDirty}
      />
    </div>
  );
}
