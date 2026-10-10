"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mutateDemoState } from "@/features/demo/store";
import { applyDemoTransition } from "@/features/demo/session-transition";
import { isDemoMode } from "@/features/demo/mode";
import { mapPomodoroSessionRow } from "@/features/pomodoro/lib/pomodoro-session-mapper";
import type {
  PomodoroSession,
  PomodoroSessionRow,
  PomodoroTransition,
} from "@/features/pomodoro/types/pomodoro-session";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type SessionActionResult =
  | Readonly<{
      status: "success";
      message: string;
      session: PomodoroSession | null;
    }>
  | Readonly<{
      status: "error";
      message: string;
    }>;

const transitionSchema = z.object({
  blockId: z.uuid(),
  transition: z.enum(["start", "pause", "resume", "complete", "cancel"]),
});

export async function transitionPomodoroSession(
  blockId: string,
  transition: PomodoroTransition,
): Promise<SessionActionResult> {


  const parsed = transitionSchema.safeParse({ blockId, transition });
  if (!parsed.success) {
    return { status: "error", message: "La transición solicitada no es válida." };
  }

  if (isDemoMode()) {
    try {
      const session = await mutateDemoState((state) => applyDemoTransition(state, parsed.data.blockId, parsed.data.transition));
      revalidatePath("/plan");
      revalidatePath("/progress");
      return { status: "success", message: "Sesión registrada en la demostración local.", session };
    } catch (error) {
      return { status: "error", message: error instanceof Error ? error.message : "No se pudo guardar la sesión." };
    }
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

    if (claimsError || !claimsData?.claims?.sub) {
      return {
        status: "error",
        message: "Tu sesión ha vencido. Inicia sesión nuevamente.",
      };
    }

    const { data, error } = await supabase.rpc(
      "transition_pomodoro_session",
      {
        target_block_id: parsed.data.blockId,
        session_transition: parsed.data.transition,
      },
    );

    if (error || !data) {
      return {
        status: "error",
        message:
          error?.code === "PGRST202"
            ? "Falta aplicar la migración 006 de sesiones Pomodoro en Supabase."
            : "No se pudo actualizar la sesión Pomodoro.",
      };
    }

    revalidatePath("/plan");
    revalidatePath("/progress");

    return {
      status: "success",
      message: "Sesión Pomodoro actualizada correctamente.",
      session: mapPomodoroSessionRow(data as PomodoroSessionRow),
    };
  } catch {
    return {
      status: "error",
      message: "No se pudo conectar con Supabase en este momento.",
    };
  }
}
