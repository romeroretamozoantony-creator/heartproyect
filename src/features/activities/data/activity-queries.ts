import "server-only";

import { mapActivityRow } from "@/features/activities/lib/activity-mapper";
import type {
  Activity,
  ActivityRow,
} from "@/features/activities/types/activity";
import { isDemoMode } from "@/features/demo/mode";
import { readDemoState } from "@/features/demo/store";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type ActivitiesQueryResult = Readonly<{
  activities: Activity[];
  error?: string;
}>;

export async function getActivities(): Promise<ActivitiesQueryResult> {
  if (isDemoMode()) {
    return { activities: (await readDemoState()).activities };
  }

  if (!hasSupabasePublicEnv()) {
    return {
      activities: [],
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
      return {
        activities: [],
        error: "No se pudo validar tu sesión.",
      };
    }

    const { data, error } = await supabase
      .from("activities")
      .select(
        "id, title, category, activity_date, start_time, end_time, priority, created_at",
      )
      .eq("user_id", userId)
      .order("activity_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      return {
        activities: [],
        error: "No se pudieron cargar las actividades guardadas.",
      };
    }

    return {
      activities: (data as ActivityRow[]).map(mapActivityRow),
    };
  } catch {
    return {
      activities: [],
      error: "Supabase no está disponible en este momento.",
    };
  }
}
