"use server";

import { revalidatePath } from "next/cache";

import { mapActivityScheduleRow } from "@/features/schedule/lib/schedule-mapper";
import {
  weeklyScheduleSchema,
  type WeeklyScheduleFormValues,
} from "@/features/schedule/schemas/weekly-schedule-schema";
import type {
  ActivitySchedule,
  ActivityScheduleRow,
} from "@/features/schedule/types/activity-schedule";
import { mutateDemoState } from "@/features/demo/store";
import { isDemoMode } from "@/features/demo/mode";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUserId } from "@/lib/supabase/session";

export type SaveScheduleResult =
  | Readonly<{
      status: "success";
      message: string;
      schedules: ActivitySchedule[];
    }>
  | Readonly<{
      status: "error";
      message: string;
    }>;

export async function saveActivitySchedules(
  values: WeeklyScheduleFormValues,
): Promise<SaveScheduleResult> {
  const parsed = weeklyScheduleSchema.safeParse(values);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los días y actividades antes de guardar.",
    };
  }

  if (isDemoMode()) {
    const schedules = parsed.data.days
      .filter((day) => day.enabled)
      .map((day) => ({
        id: crypto.randomUUID(),
        activityId: day.activityId,
        dayOfWeek: day.dayOfWeek,
        allocatedMinutes: day.allocatedMinutes,
        startTime: day.startTime,
        alertBeforeStartMinutes: day.alertBeforeStartMinutes,
        alertOnEnd: day.alertOnEnd,
      }));

    const valid = await mutateDemoState((state) => {
      if (schedules.some((day) => !state.activities.some((activity) => activity.id === day.activityId && activity.kind === "rutina"))) return false;
      state.schedules = schedules;
      return true;
    });
    if (!valid) return { status: "error", message: "El cronograma contiene una actividad no disponible." };
    revalidatePath("/schedule");
    return {
      status: "success",
      message: "Cronograma guardado en la demostración local.",
      schedules,
    };
  }

  if (!hasSupabasePublicEnv()) {
    return {
      status: "error",
      message:
        "Supabase todavía no está configurado. Completa las variables de .env.local.",
    };
  }

  try {
    const supabase = await createClient();
    if (!(await getAuthenticatedUserId(supabase))) {
      return {
        status: "error",
        message: "Tu sesión ha vencido. Inicia sesión nuevamente.",
      };
    }

    const scheduleRows = parsed.data.days
      .filter((day) => day.enabled)
      .map((day) => ({
        activity_id: day.activityId,
        day_of_week: day.dayOfWeek,
        allocated_minutes: day.allocatedMinutes,
        start_time: day.startTime,
        alert_before_start_minutes: day.alertBeforeStartMinutes,
        alert_on_end: day.alertOnEnd,
      }));
    const { data, error } = await supabase.rpc("replace_activity_schedules", {
      schedule_rows: scheduleRows,
    });

    if (error || !data) {
      const missingMigration = error?.code === "PGRST202";

      return {
        status: "error",
        message: missingMigration
          ? "Falta aplicar la migración de cronogramas en Supabase."
          : "No se pudo guardar el cronograma. Inténtalo nuevamente.",
      };
    }

    const schedules = (data as ActivityScheduleRow[]).map(
      mapActivityScheduleRow,
    );
    revalidatePath("/schedule");

    return {
      status: "success",
      message: "Cronograma guardado correctamente.",
      schedules,
    };
  } catch {
    return {
      status: "error",
      message: "Supabase no está disponible. Inténtalo nuevamente.",
    };
  }
}
