import "server-only";

import { mapActivityRow } from "@/features/activities/lib/activity-mapper";
import type {
  Activity,
  ActivityKind,
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

// "registro" son los datos del día a día; "rutina" son las opciones del cronograma.
export async function getActivities(
  kind: ActivityKind = "registro",
): Promise<ActivitiesQueryResult> {
  if (isDemoMode()) {
    return {
      activities: (await readDemoState()).activities.filter(
        (activity) => activity.kind === kind,
      ),
    };
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
        "id, title, category, kind, activity_date, start_time, end_time, priority, created_at",
      )
      .eq("user_id", userId)
      .eq("kind", kind)
      .order("activity_date", { ascending: true, nullsFirst: false })
      .order("start_time", { ascending: true, nullsFirst: false })
      .order("title", { ascending: true });

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
