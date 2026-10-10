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
import { mutateDemoState } from "@/features/demo/store";
import { isDemoMode } from "@/features/demo/mode";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const activityIdSchema = z.string().uuid();

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
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (claimsError || !userId) {
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
    const activity = await mutateDemoState((state) => {
      const existing = state.activities.find((item) => item.id === parsedId.data);
      if (!existing) return null;
      const updated = { ...existing, ...parsedValues.data };
      state.activities = state.activities.map((item) => item.id === parsedId.data ? updated : item);
      return updated;
    });
    if (!activity) return { status: "error", message: "La actividad ya no está disponible." };
    refreshActivityPages();
    return { status: "success", message: "Actividad actualizada en la demostración local.", activity };
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
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (claimsError || !userId) {
      return {
        status: "error",
        message: "Tu sesión ha vencido. Inicia sesión nuevamente.",
      };
    }

    const { activityDate, category, endTime, priority, startTime, title } =
      parsedValues.data;
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

    return {
      status: "success",
      message: "Actividad actualizada correctamente.",
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
    await mutateDemoState((state) => {
      state.activities = state.activities.filter((item) => item.id !== parsedId.data);
      state.schedules = state.schedules.filter((item) => item.activityId !== parsedId.data);
      state.files = state.files.filter((item) => item.activityId !== parsedId.data);
      state.blocks = state.blocks.filter((item) => item.activityId !== parsedId.data);
      state.sessions = state.sessions.filter((item) => item.activityId !== parsedId.data);
    });
    refreshActivityPages();
    return { status: "success", message: "Actividad eliminada en la demostración local." };
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
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (claimsError || !userId) {
      return {
        status: "error",
        message: "Tu sesión ha vencido. Inicia sesión nuevamente.",
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

    return {
      status: "success",
      message: "Actividad eliminada correctamente.",
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
