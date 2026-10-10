"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapActivityRow } from "@/features/activities/lib/activity-mapper";
import {
  activitySchema,
  type ActivityFormValues,
} from "@/features/activities/schemas/activity-schema";
import type {
  Activity,
  ActivityRow,
} from "@/features/activities/types/activity";
import { mutateDemoState, removeDemoFileBytes, type DemoState } from "@/features/demo/store";
import { isDemoMode } from "@/features/demo/mode";
import { STORAGE_BUCKET } from "@/features/files/lib/file-storage";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUserId, type ServerSupabase } from "@/lib/supabase/session";

const activityIdSchema = z.string().uuid();

const ACTIVITY_COLUMNS = "id, title, category, activity_date, start_time, end_time, priority, created_at";
const PLAN_FIELDS = ["title", "activityDate", "startTime", "endTime"] as const;
const PLAN_NOT_MARKED_NOTICE = "El plan no se marcó para reestructurarse; revísalo en Plan de estudio.";

function affectsPlan(previous: Activity, next: Activity) {
  return PLAN_FIELDS.some((field) => previous[field] !== next[field]);
}

function restructureDemoPlanFor(state: DemoState, activityId: string) {
  const usesActivity = state.blocks.some((block) => block.activityId === activityId && block.status !== "completed");
  if (!usesActivity || !state.plan || !["draft", "confirmed"].includes(state.plan.status)) return true;
  if (state.sessions.some((session) => session.status === "running" || session.status === "paused")) return false;
  state.plan = { ...state.plan, status: "restructured", confirmedAt: null };
  return true;
}

async function planIdsForActivity(supabase: ServerSupabase, activityId: string) {
  const { data, error } = await supabase
    .from("plan_blocks")
    .select("plan_id")
    .eq("activity_id", activityId)
    .neq("status", "completed");

  if (error) return null;
  return [...new Set((data ?? []).map((block) => block.plan_id as string))];
}

async function restructurePlans(supabase: ServerSupabase, planIds: string[]) {
  if (planIds.length === 0) return true;

  const { data: plans, error } = await supabase
    .from("study_plans")
    .select("id")
    .in("id", planIds)
    .in("status", ["draft", "confirmed"]);

  if (error) return false;

  for (const plan of plans ?? []) {
    const { error: transitionError } = await supabase.rpc("transition_study_plan", {
      target_plan_id: plan.id,
      plan_transition: "restructure",
    });

    if (transitionError) return false;
  }

  return true;
}

export type ActivityMutationResult =
  | Readonly<{
      status: "success";
      message: string;
      activity: Activity;
    }>
  | Readonly<{
      status: "error";
      message: string;
    }>;

export async function createActivity(
  values: ActivityFormValues,
): Promise<ActivityMutationResult> {
  const parsed = activitySchema.safeParse(values);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los datos de la actividad antes de guardarla.",
    };
  }

  if (isDemoMode()) {
    const activity = { id: crypto.randomUUID(), ...parsed.data, createdAt: new Date().toISOString() };
    await mutateDemoState((state) => { state.activities.push(activity); });
    refreshActivityPages();
    return { status: "success", message: "Actividad guardada en la demostración local.", activity };
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
    const userId = await getAuthenticatedUserId(supabase);

    if (!userId) {
      return {
        status: "error",
        message: "Tu sesión ha vencido. Inicia sesión nuevamente.",
      };
    }

    const { activityDate, category, endTime, priority, startTime, title } =
      parsed.data;
    const { data, error } = await supabase
      .from("activities")
      .insert({
        user_id: userId,
        title,
        category,
        activity_date: activityDate,
        start_time: startTime,
        end_time: endTime,
        priority,
      })
      .select(
        "id, title, category, activity_date, start_time, end_time, priority, created_at",
      )
      .single();

    if (error || !data) {
      return {
        status: "error",
        message: "No se pudo guardar la actividad. Inténtalo nuevamente.",
      };
    }

    const activity = mapActivityRow(data as ActivityRow);
    refreshActivityPages();

    return {
      status: "success",
      message: "Actividad guardada correctamente.",
      activity,
    };
  } catch {
    return {
      status: "error",
      message: "Supabase no está disponible. Inténtalo nuevamente.",
    };
  }
}

export async function updateActivity(
  activityId: string,
  values: ActivityFormValues,
): Promise<ActivityMutationResult> {
  const parsedId = activityIdSchema.safeParse(activityId);
  const parsedValues = activitySchema.safeParse(values);

  if (!parsedId.success || !parsedValues.success) {
    return {
      status: "error",
      message: "Revisa los datos de la actividad antes de actualizarla.",
    };
  }

  if (isDemoMode()) {
    const result = await mutateDemoState((state) => {
      const existing = state.activities.find((item) => item.id === parsedId.data);
      if (!existing) return null;
      const updated = { ...existing, ...parsedValues.data };
      state.activities = state.activities.map((item) => item.id === parsedId.data ? updated : item);
      const planReady = !affectsPlan(existing, updated) || restructureDemoPlanFor(state, parsedId.data);
      return { activity: updated, planReady };
    });
    if (!result) return { status: "error", message: "La actividad ya no está disponible." };
    refreshActivityPages();
    return {
      status: "success",
      message: result.planReady
        ? "Actividad actualizada en la demostración local."
        : `Actividad actualizada en la demostración local. ${PLAN_NOT_MARKED_NOTICE}`,
      activity: result.activity,
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
    const userId = await getAuthenticatedUserId(supabase);

    if (!userId) {
      return {
        status: "error",
        message: "Tu sesión ha vencido. Inicia sesión nuevamente.",
      };
    }

    const { activityDate, category, endTime, priority, startTime, title } =
      parsedValues.data;
    const { data: previousRow, error: previousError } = await supabase
      .from("activities")
      .select(ACTIVITY_COLUMNS)
      .eq("id", parsedId.data)
      .eq("user_id", userId)
      .maybeSingle();

    if (previousError || !previousRow) {
      return {
        status: "error",
        message: "No se pudo actualizar la actividad.",
      };
    }
    const previous = mapActivityRow(previousRow as ActivityRow);
    const { data, error } = await supabase
      .from("activities")
      .update({
        title,
        category,
        activity_date: activityDate,
        start_time: startTime,
        end_time: endTime,
        priority,
      })
      .eq("id", parsedId.data)
      .eq("user_id", userId)
      .select(
        "id, title, category, activity_date, start_time, end_time, priority, created_at",
      )
      .maybeSingle();

    if (error || !data) {
      return {
        status: "error",
        message: "No se pudo actualizar la actividad.",
      };
    }

    const activity = mapActivityRow(data as ActivityRow);
    refreshActivityPages();

    const planIds = affectsPlan(previous, activity)
      ? await planIdsForActivity(supabase, parsedId.data)
      : [];
    const planReady = planIds !== null && (await restructurePlans(supabase, planIds));

    return {
      status: "success",
      message: planReady
        ? "Actividad actualizada correctamente."
        : `Actividad actualizada correctamente. ${PLAN_NOT_MARKED_NOTICE}`,
      activity,
    };
  } catch {
    return {
      status: "error",
      message: "Supabase no está disponible. Inténtalo nuevamente.",
    };
  }
}

export type DeleteActivityResult = Readonly<{
  status: "error" | "success";
  message: string;
}>;

export async function deleteActivity(
  activityId: string,
): Promise<DeleteActivityResult> {
  const parsedId = activityIdSchema.safeParse(activityId);

  if (!parsedId.success) {
    return {
      status: "error",
      message: "La actividad seleccionada no es válida.",
    };
  }

  if (isDemoMode()) {
    const result = await mutateDemoState((state) => {
      if (!state.activities.some((item) => item.id === parsedId.data)) return null;
      const planReady = restructureDemoPlanFor(state, parsedId.data);
      const fileIds = state.files.filter((item) => item.activityId === parsedId.data).map((item) => item.id);
      state.activities = state.activities.filter((item) => item.id !== parsedId.data);
      state.schedules = state.schedules.filter((item) => item.activityId !== parsedId.data);
      state.files = state.files.filter((item) => item.activityId !== parsedId.data);
      state.blocks = state.blocks.filter((item) => item.activityId !== parsedId.data);
      state.sessions = state.sessions.filter((item) => item.activityId !== parsedId.data);
      return { removedFileIds: fileIds, planReady };
    });
    if (!result) return { status: "error", message: "La actividad ya no está disponible." };
    const { removedFileIds, planReady } = result;
    for (const fileId of removedFileIds) await removeDemoFileBytes(fileId);
    refreshActivityPages();
    return {
      status: "success",
      message: planReady
        ? "Actividad eliminada en la demostración local."
        : `Actividad eliminada en la demostración local. ${PLAN_NOT_MARKED_NOTICE}`,
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
    const userId = await getAuthenticatedUserId(supabase);

    if (!userId) {
      return {
        status: "error",
        message: "Tu sesión ha vencido. Inicia sesión nuevamente.",
      };
    }

    const { data: storedFiles, error: filesError } = await supabase
      .from("uploaded_files")
      .select("object_path")
      .eq("activity_id", parsedId.data)
      .eq("user_id", userId);

    if (filesError) {
      return {
        status: "error",
        message: "No se pudo eliminar la actividad.",
      };
    }

    const planIds = await planIdsForActivity(supabase, parsedId.data);
    if (planIds === null) {
      return {
        status: "error",
        message: "No se pudo eliminar la actividad.",
      };
    }

    const { data, error } = await supabase
      .from("activities")
      .delete()
      .eq("id", parsedId.data)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return {
        status: "error",
        message: "No se pudo eliminar la actividad.",
      };
    }

    refreshActivityPages();

    const planReady = await restructurePlans(supabase, planIds);
    const objectPaths = (storedFiles ?? []).map((file) => file.object_path);
    let storageReady = true;

    if (objectPaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(objectPaths);
      storageReady = !storageError;
    }

    const notices = [
      storageReady ? null : "Algunos archivos no se pudieron borrar del almacenamiento.",
      planReady ? null : PLAN_NOT_MARKED_NOTICE,
    ].filter((notice): notice is string => notice !== null);

    return {
      status: "success",
      message: notices.length > 0
        ? ["Actividad eliminada.", ...notices].join(" ")
        : "Actividad eliminada correctamente.",
    };
  } catch {
    return {
      status: "error",
      message: "Supabase no está disponible. Inténtalo nuevamente.",
    };
  }
}

function refreshActivityPages() {
  for (const path of ["/activities", "/schedule", "/plan", "/progress"]) revalidatePath(path);
}
