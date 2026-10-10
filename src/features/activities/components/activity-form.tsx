"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck, Save } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
  activitySchema,
  type ActivityFormValues,
} from "@/features/activities/schemas/activity-schema";
import {
  createActivity,
  updateActivity,
  type ActivityMutationResult,
} from "@/features/activities/actions/activity-actions";
import type { Activity } from "@/features/activities/types/activity";

type ActivityFormProps =
  | Readonly<{
      mode?: "create";
      onPreview: (activity: ActivityFormValues) => void;
      onCreated: (activity: Activity) => void;
    }>
  | Readonly<{
      mode: "edit";
      activity: Activity;
      onUpdated: (activity: Activity) => void;
      onCancel: () => void;
    }>;

type FieldErrorProps = Readonly<{
  id: string;
  message?: string;
}>;

function FieldError({ id, message }: FieldErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <p id={id} className="text-sm text-destructive" role="alert">
      {message}
    </p>
  );
}

export function ActivityForm(props: ActivityFormProps) {
  const isEditing = props.mode === "edit";
  const fieldPrefix = isEditing ? `edit-${props.activity.id}` : "create";
  const [result, setResult] = useState<ActivityMutationResult | null>(null);
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: isEditing
      ? {
          title: props.activity.title,
          category: props.activity.category,
          activityDate: props.activity.activityDate,
          startTime: props.activity.startTime,
          endTime: props.activity.endTime,
          priority: props.activity.priority,
        }
      : {
          title: "",
          category: "academic",
          activityDate: "",
          startTime: "",
          endTime: "",
          priority: "medium",
        },
    mode: "onBlur",
  });

  async function onSubmit(values: ActivityFormValues) {
    setResult(null);

    if (props.mode === "edit") {
      const nextResult = await updateActivity(props.activity.id, values);
      setResult(nextResult);

      if (nextResult.status === "success") {
        props.onUpdated(nextResult.activity);
      }

      return;
    }

    props.onPreview(values);
    const nextResult = await createActivity(values);
    setResult(nextResult);

    if (nextResult.status === "success") {
      props.onCreated(nextResult.activity);
      reset();
    }
  }

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <Label htmlFor={`${fieldPrefix}-title`}>Título de la actividad</Label>
        <Input
          {...register("title")}
          id={`${fieldPrefix}-title`}
          aria-describedby={
            errors.title ? `${fieldPrefix}-title-error` : undefined
          }
          aria-invalid={Boolean(errors.title)}
          placeholder="Ejemplo: Repasar programación orientada a objetos"
        />
        <FieldError
          id={`${fieldPrefix}-title-error`}
          message={errors.title?.message}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${fieldPrefix}-category`}>Categoría</Label>
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger
                id={`${fieldPrefix}-category`}
                className="w-full"
                aria-describedby={
                  errors.category
                    ? `${fieldPrefix}-category-error`
                    : undefined
                }
                aria-invalid={Boolean(errors.category)}
              >
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="academic">Académica</SelectItem>
                <SelectItem value="work">Laboral</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        <FieldError
          id={`${fieldPrefix}-category-error`}
          message={errors.category?.message}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${fieldPrefix}-activityDate`}>Fecha</Label>
        <Input
          {...register("activityDate")}
          id={`${fieldPrefix}-activityDate`}
          type="date"
          aria-describedby={
            errors.activityDate
              ? `${fieldPrefix}-activityDate-error`
              : undefined
          }
          aria-invalid={Boolean(errors.activityDate)}
        />
        <FieldError
          id={`${fieldPrefix}-activityDate-error`}
          message={errors.activityDate?.message}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${fieldPrefix}-startTime`}>Hora de inicio</Label>
          <Input
            {...register("startTime")}
            id={`${fieldPrefix}-startTime`}
            type="time"
            aria-describedby={
              errors.startTime ? `${fieldPrefix}-startTime-error` : undefined
            }
            aria-invalid={Boolean(errors.startTime)}
          />
          <FieldError
            id={`${fieldPrefix}-startTime-error`}
            message={errors.startTime?.message}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${fieldPrefix}-endTime`}>Hora de fin</Label>
          <Input
            {...register("endTime")}
            id={`${fieldPrefix}-endTime`}
            type="time"
            aria-describedby={
              errors.endTime ? `${fieldPrefix}-endTime-error` : undefined
            }
            aria-invalid={Boolean(errors.endTime)}
          />
          <FieldError
            id={`${fieldPrefix}-endTime-error`}
            message={errors.endTime?.message}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${fieldPrefix}-priority`}>Prioridad</Label>
        <Controller
          control={control}
          name="priority"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger
                id={`${fieldPrefix}-priority`}
                className="w-full"
                aria-describedby={
                  errors.priority
                    ? `${fieldPrefix}-priority-error`
                    : undefined
                }
                aria-invalid={Boolean(errors.priority)}
              >
                <SelectValue placeholder="Selecciona una prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="low">Baja</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        <FieldError
          id={`${fieldPrefix}-priority-error`}
          message={errors.priority?.message}
        />
      </div>

      {result ? (
        <Alert variant={result.status === "error" ? "destructive" : "default"}>
          {result.status === "success" ? (
            <CircleCheck aria-hidden="true" />
          ) : null}
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {props.mode === "edit" ? (
          <Button
            disabled={isSubmitting}
            type="button"
            variant="outline"
            onClick={props.onCancel}
          >
            Cancelar
          </Button>
        ) : null}
        <Button
          className={props.mode === "edit" ? undefined : "h-10 w-full"}
          disabled={isSubmitting}
          type="submit"
        >
          <Save aria-hidden="true" data-icon="inline-start" />
          {isSubmitting
            ? "Guardando..."
            : props.mode === "edit"
              ? "Guardar cambios"
              : "Guardar actividad"}
        </Button>
      </div>
    </form>
  );
}
