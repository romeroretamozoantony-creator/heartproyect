"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getActivities } from "@/features/activities/data/activity-queries";
import { mutateDemoState } from "@/features/demo/store";
import { isDemoMode } from "@/features/demo/mode";
import { generatePomodoroPlan } from "@/features/planner/lib/pomodoro-planner";
import { getActivitySchedules } from "@/features/schedule/data/schedule-queries";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUserId } from "@/lib/supabase/session";

export type GeneratePlanResult =
  | Readonly<{
      status: "success";
      message: string;
      planId: string;
    }>
  | Readonly<{
      status: "error";
      message: string;
    }>;

export type PlanTransitionResult =
  | Readonly<{
      status: "success";
      message: string;
      planStatus: "confirmed" | "restructured";
      confirmedAt: string | null;
    }>
  | Readonly<{
      status: "error";
      message: string;
    }>;

const planIdSchema = z.uuid();

async function getAuthenticatedPlanClient() {
  if (!hasSupabasePublicEnv()) {
    return {
      error:
        "Supabase todavía no está configurado. Completa las variables de .env.local.",
    } as const;
  }

  const supabase = await createClient();
  const userId = await getAuthenticatedUserId(supabase);

  if (!userId) {
    return {
      error: "Tu sesión ha vencido. Inicia sesión nuevamente.",
    } as const;
  }

  return { supabase, userId } as const;
}

export async function generateStudyPlan(): Promise<GeneratePlanResult> {
  if (!isDemoMode() && !hasSupabasePublicEnv()) {
    return {
      status: "error",
      message:
        "Supabase todavía no está configurado. Completa las variables de .env.local.",
    };
  }

  const [activitiesResult, schedulesResult] = await Promise.all([
    getActivities(),
    getActivitySchedules(),
  ]);

  if (activitiesResult.error || schedulesResult.error) {
    return {
      status: "error",
      message: "No se pudieron recuperar los datos necesarios para el plan.",
    };
  }

  if (schedulesResult.schedules.length === 0) {
    return {
      status: "error",
      message: "Guarda al menos un día en el cronograma antes de diseñar el plan.",
    };
  }

  try {
    const generated = generatePomodoroPlan({
      activities: activitiesResult.activities,
      schedules: schedulesResult.schedules,
    });

    if (isDemoMode()) {
      const planId = await mutateDemoState((state) => {
        if (state.sessions.some((session) => session.status === "running" || session.status === "paused")) throw new Error("Completa o cancela la sesión actual antes de diseñar otro plan.");
        const id = crypto.randomUUID();
        state.plan = { id, name: generated.name, status: "draft", confirmedAt: null, createdAt: new Date().toISOString() };
        state.blocks = generated.blocks.map((block) => ({ ...block, id: crypto.randomUUID(), status: "pending" }));
        state.sessions = [];
        return id;
      });
      revalidatePath("/plan");
      revalidatePath("/progress");
      return { status: "success", message: "Plan generado con tu cronograma guardado.", planId };
    }

    const supabase = await createClient();
    const userId = await getAuthenticatedUserId(supabase);

    if (!userId) {
      return {
        status: "error",
        message: "Tu sesión ha vencido. Inicia sesión nuevamente.",
      };
    }

    const { data: runningSessions, error: runningError } = await supabase
      .from("pomodoro_sessions").select("id").eq("user_id", userId)
      .in("status", ["running", "paused"]).limit(1);
    if (runningError || runningSessions?.length) return {
      status: "error", message: "Completa o cancela la sesión actual antes de diseñar otro plan.",
    };

    const planBlocks = generated.blocks.map((block) => ({
      activity_id: block.activityId,
      block_type: block.blockType,
      position: block.position,
      title: block.title,
      scheduled_start: block.scheduledStart,
      scheduled_end: block.scheduledEnd,
      planned_minutes: block.plannedMinutes,
    }));
    const { data, error } = await supabase.rpc("create_study_plan", {
      plan_name: generated.name,
      plan_blocks: planBlocks,
    });

    if (error || typeof data !== "string") {
      return {
        status: "error",
        message:
          error?.code === "PGRST202"
            ? "Falta aplicar la migración 005 del planificador en Supabase."
            : "No se pudo guardar el plan generado. Inténtalo nuevamente.",
      };
    }

    revalidatePath("/plan");
    revalidatePath("/progress");

    return {
      status: "success",
      message: "Plan Pomodoro generado correctamente.",
      planId: data,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "No se pudo generar el plan Pomodoro.",
    };
  }
}

export async function confirmStudyPlan(
  planId: string,
): Promise<PlanTransitionResult> {
  const confirmedAt = new Date().toISOString();

  if (isDemoMode()) {
    const changed = await mutateDemoState((state) => {
      if (state.plan?.id !== planId || !["draft"].includes(state.plan.status)) return false;
      if (state.sessions.some((session) => session.status === "running" || session.status === "paused")) return false;
      state.plan = { ...state.plan, status: "confirmed", confirmedAt: confirmedAt };
      return true;
    });
    if (!changed) return { status: "error", message: "El plan no está disponible o tiene una sesión activa. Completa o cancela la sesión antes de continuar." };
    revalidatePath("/plan");
    revalidatePath("/progress");
    return { status: "success", message: "Plan confirmado.", planStatus: "confirmed", confirmedAt: confirmedAt };
  }

  if (!planIdSchema.safeParse(planId).success) {
    return { status: "error", message: "El plan seleccionado no es válido." };
  }

  try {
    const auth = await getAuthenticatedPlanClient();

    if ("error" in auth) {
      return {
        status: "error",
        message: auth.error ?? "No se pudo validar tu sesión.",
      };
    }

    const { data, error } = await auth.supabase.rpc("transition_study_plan", {
      target_plan_id: planId, plan_transition: "confirm",
    });

    if (error) {
      return {
        status: "error",
        message: "No se pudo confirmar el plan. Inténtalo nuevamente.",
      };
    }

    if (!data) {
      return {
        status: "error",
        message: "El plan ya cambió de estado o no está disponible.",
      };
    }

    revalidatePath("/plan");
    revalidatePath("/progress");

    return {
      status: "success",
      message: "Plan confirmado correctamente.",
      planStatus: "confirmed",
      confirmedAt: data.confirmed_at,
    };
  } catch {
    return {
      status: "error",
      message: "No se pudo conectar con Supabase en este momento.",
    };
  }
}

export async function restructureStudyPlan(
  planId: string,
): Promise<PlanTransitionResult> {
  if (isDemoMode()) {
    const changed = await mutateDemoState((state) => {
      if (state.plan?.id !== planId || !["draft", "confirmed"].includes(state.plan.status)) return false;
      if (state.sessions.some((session) => session.status === "running" || session.status === "paused")) return false;
      state.plan = { ...state.plan, status: "restructured", confirmedAt: null };
      return true;
    });
    if (!changed) return { status: "error", message: "El plan no está disponible o tiene una sesión activa. Completa o cancela la sesión antes de continuar." };
    revalidatePath("/plan");
    revalidatePath("/progress");
    return { status: "success", message: "Plan listo para reestructurarse.", planStatus: "restructured", confirmedAt: null };
  }

  if (!planIdSchema.safeParse(planId).success) {
    return { status: "error", message: "El plan seleccionado no es válido." };
  }

  try {
    const auth = await getAuthenticatedPlanClient();

    if ("error" in auth) {
      return {
        status: "error",
        message: auth.error ?? "No se pudo validar tu sesión.",
      };
    }

    const { data, error } = await auth.supabase.rpc("transition_study_plan", {
      target_plan_id: planId, plan_transition: "restructure",
    });

    if (error) {
      return {
        status: "error",
        message: "No se pudo reestructurar el plan. Inténtalo nuevamente.",
      };
    }

    if (!data) {
      return {
        status: "error",
        message: "El plan ya cambió de estado o no está disponible.",
      };
    }

    revalidatePath("/plan");
    revalidatePath("/schedule");

    return {
      status: "success",
      message: "Plan listo para reestructurarse desde el cronograma.",
      planStatus: "restructured",
      confirmedAt: null,
    };
  } catch {
    return {
      status: "error",
      message: "No se pudo conectar con Supabase en este momento.",
    };
  }
}
