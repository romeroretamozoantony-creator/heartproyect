import "server-only";

import { mapActivityScheduleRow } from "@/features/schedule/lib/schedule-mapper";
import type {
  ActivitySchedule,
  ActivityScheduleRow,
} from "@/features/schedule/types/activity-schedule";
import { isDemoMode } from "@/features/demo/mode";
import { readDemoState } from "@/features/demo/store";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type ScheduleQueryResult = Readonly<{
  schedules: ActivitySchedule[];
  error?: string;
}>;

export async function getActivitySchedules(): Promise<ScheduleQueryResult> {
  if (isDemoMode()) {
    return { schedules: (await readDemoState()).schedules };
  }

  if (!hasSupabasePublicEnv()) {
    return {
      schedules: [],
      error:
        "Supabase todavía no está configurado. Completa las variables de .env.local.",
    };
  }

  try {
    const supabase = await createClient();
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (claimsError || !userId) {
      return { schedules: [], error: "No se pudo validar tu sesión." };
    }

    const { data, error } = await supabase
      .from("activity_schedules")
      .select(
        "id, activity_id, day_of_week, allocated_minutes, start_time, alert_before_start_minutes, alert_on_end",
      )
      .eq("user_id", userId)
      .order("day_of_week", { ascending: true });

    if (error) {
      return {
        schedules: [],
        error: "No se pudo cargar el cronograma guardado.",
      };
    }

    return {
      schedules: (data as ActivityScheduleRow[]).map(mapActivityScheduleRow),
    };
  } catch {
    return {
      schedules: [],
      error: "Supabase no está disponible en este momento.",
    };
  }
}
