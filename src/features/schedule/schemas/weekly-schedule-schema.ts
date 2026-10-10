import { z } from "zod";

export const WEEKDAYS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
] as const;

const scheduleDaySchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    enabled: z.boolean(),
    activityId: z.string(),
    allocatedMinutes: z
      .number({ error: "Ingresa una duración válida." })
      .int("La duración debe expresarse en minutos.")
      .min(1, "La duración mínima es de 1 minuto.")
      .max(1440, "La duración máxima es de 1440 minutos."),
    alertBeforeStartMinutes: z
      .number()
      .int()
      .min(0)
      .max(1440)
      .nullable(),
    alertOnEnd: z.boolean(),
  })
  .superRefine(({ activityId, enabled }, context) => {
    if (enabled && !z.string().uuid().safeParse(activityId).success) {
      context.addIssue({
        code: "custom",
        message: "Selecciona una actividad para este día.",
        path: ["activityId"],
      });
    }
  });

export const weeklyScheduleSchema = z
  .object({
    days: z.array(scheduleDaySchema).length(7),
  })
  .refine(({ days }) => days.some((day) => day.enabled), {
    message: "Selecciona al menos un día para preparar el cronograma.",
    path: ["days"],
  });

export type WeeklyScheduleFormValues = z.infer<typeof weeklyScheduleSchema>;
export type ScheduleDayValues = WeeklyScheduleFormValues["days"][number];
