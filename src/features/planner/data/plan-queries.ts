import "server-only";

import {
  mapPlanBlockRow,
  mapStudyPlanRow,
} from "@/features/planner/lib/plan-mapper";
import type {
  PlanBlock,
  PlanBlockRow,
  StudyPlan,
  StudyPlanRow,
} from "@/features/planner/types/study-plan";
import { isDemoMode } from "@/features/demo/mode";
import { readDemoState } from "@/features/demo/store";
import { mapPomodoroSessionRow } from "@/features/pomodoro/lib/pomodoro-session-mapper";
import type {
  PomodoroSession,
  PomodoroSessionRow,
  PomodoroSummary,
} from "@/features/pomodoro/types/pomodoro-session";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type LatestPlanResult = Readonly<{
  plan: StudyPlan | null;
  blocks: PlanBlock[];
  activeSession: PomodoroSession | null;
  summary: PomodoroSummary;
  error?: string;
}>;

const EMPTY_SUMMARY: PomodoroSummary = {
  totalBlocks: 0,
  completedBlocks: 0,
  focusSeconds: 0,
  restSeconds: 0,
};

export async function getLatestStudyPlan(): Promise<LatestPlanResult> {
  if (isDemoMode()) {
    const state = await readDemoState();
    const completed = state.sessions.filter((session) => session.status === "completed");
    return {
      plan: state.plan,
      blocks: state.blocks,
      activeSession: state.sessions.find((session) => session.status === "running" || session.status === "paused") ?? null,
      summary: {
        totalBlocks: state.blocks.length,
        completedBlocks: state.blocks.filter((block) => block.status === "completed").length,
        focusSeconds: completed.filter((session) => session.sessionType === "focus").reduce((sum, session) => sum + session.elapsedSeconds, 0),
        restSeconds: completed.filter((session) => session.sessionType === "rest").reduce((sum, session) => sum + session.elapsedSeconds, 0),
      },
    };
  }

  if (!hasSupabasePublicEnv()) {
    return {
      plan: null,
      blocks: [],
      activeSession: null,
      summary: EMPTY_SUMMARY,
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
        plan: null,
        blocks: [],
        activeSession: null,
        summary: EMPTY_SUMMARY,
        error: "No se pudo validar tu sesión.",
      };
    }

    const { data: planData, error: planError } = await supabase
      .from("study_plans")
      .select("id, name, status, confirmed_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (planError) {
      return {
        plan: null,
        blocks: [],
        activeSession: null,
        summary: EMPTY_SUMMARY,
        error: "No se pudo cargar el plan de estudio.",
      };
    }

    if (!planData) {
      return {
        plan: null,
        blocks: [],
        activeSession: null,
        summary: EMPTY_SUMMARY,
      };
    }

    const plan = mapStudyPlanRow(planData as StudyPlanRow);
    const { data: blocksData, error: blocksError } = await supabase
      .from("plan_blocks")
      .select(
        "id, activity_id, block_type, position, title, scheduled_start, scheduled_end, planned_minutes, status",
      )
      .eq("user_id", userId)
      .eq("plan_id", plan.id)
      .order("position", { ascending: true });

    if (blocksError) {
      return {
        plan,
        blocks: [],
        activeSession: null,
        summary: EMPTY_SUMMARY,
        error: "No se pudieron cargar los bloques del plan.",
      };
    }

    const blocks = (blocksData as PlanBlockRow[]).map(mapPlanBlockRow);
    const blockIds = blocks.map((block) => block.id);
    let activeSession: PomodoroSession | null = null;
    const summary = {
      ...EMPTY_SUMMARY,
      totalBlocks: blocks.length,
      completedBlocks: blocks.filter((block) => block.status === "completed")
        .length,
    };

    if (blockIds.length > 0) {
      const { data: sessionsData, error: sessionError } = await supabase
        .from("pomodoro_sessions")
        .select(
          "id, plan_block_id, activity_id, session_type, status, planned_seconds, elapsed_seconds, started_at, last_resumed_at, ended_at",
        )
        .eq("user_id", userId)
        .in("plan_block_id", blockIds)
        .order("created_at", { ascending: false });

      if (sessionError) {
        return {
          plan,
          blocks,
          activeSession: null,
          summary,
          error: "No se pudo recuperar la sesión Pomodoro activa.",
        };
      }

      const sessions = (sessionsData as PomodoroSessionRow[]).map(
        mapPomodoroSessionRow,
      );
      activeSession =
        sessions.find(
          (session) =>
            session.status === "running" || session.status === "paused",
        ) ?? null;

      for (const session of sessions) {
        if (session.status !== "completed") {
          continue;
        }

        if (session.sessionType === "focus") {
          summary.focusSeconds += session.elapsedSeconds;
        } else {
          summary.restSeconds += session.elapsedSeconds;
        }
      }
    }

    return { plan, blocks, activeSession, summary };
  } catch {
    return {
      plan: null,
      blocks: [],
      activeSession: null,
      summary: EMPTY_SUMMARY,
      error: "Supabase no está disponible en este momento.",
    };
  }
}
