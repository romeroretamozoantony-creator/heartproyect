import { z } from "zod";

export const ACTIVITY_CATEGORIES = ["academic", "work", "personal"] as const;
export const ACTIVITY_PRIORITIES = ["high", "medium", "low"] as const;

export const activitySchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Ingresa el título de la actividad.")
      .max(120, "El título no puede superar los 120 caracteres."),
    category: z.enum(ACTIVITY_CATEGORIES, {
      error: "Selecciona una categoría.",
    }),
    activityDate: z
      .string()
      .min(1, "Selecciona la fecha de la actividad."),
    startTime: z.string().min(1, "Selecciona la hora de inicio."),
    endTime: z.string().min(1, "Selecciona la hora de fin."),
    priority: z.enum(ACTIVITY_PRIORITIES, {
      error: "Selecciona una prioridad.",
    }),
  })
  .refine(
    ({ endTime, startTime }) =>
      !endTime || !startTime || endTime > startTime,
    {
      message: "La hora de fin debe ser posterior a la hora de inicio.",
      path: ["endTime"],
    },
  );

export type ActivityFormValues = z.infer<typeof activitySchema>;
