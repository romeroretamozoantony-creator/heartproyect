import "server-only";

import type { ActivityRow } from "@/features/activities/types/activity";
import { getEvaluationLevel } from "@/features/evaluations/lib/evaluation-scale";
import type {
  EvaluationProgressItem,
  EvaluationStatus,
} from "@/features/evaluations/types/evaluation";
import { isDemoMode } from "@/features/demo/mode";
import { readDemoState } from "@/features/demo/store";
import type {
  ActivityProgressItem,
  CategoryProgressItem,
  DailyFocusItem,
  ProgressOverview,
} from "@/features/progress/types/progress";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type PlanBlockSummaryRow = Readonly<{
  id: string;
  activity_id: string | null;
  status: string;
  block_type: string;
  planned_minutes: number;
}>;

type PomodoroSummaryRow = Readonly<{
  session_type: string;
  status: string;
  elapsed_seconds: number;
}>;

type DailyPomodoroRow = Readonly<{
  elapsed_seconds: number;
  ended_at: string;
}>;

type UploadedFileSummaryRow = Readonly<{
  id: string;
  activity_id: string;
  original_name: string;
}>;

type EvaluationSummaryRow = Readonly<{
  id: string;
  activity_id: string;
  file_id: string;
  status: Exclude<EvaluationStatus, "not_requested">;
  score: number | string | null;
  feedback: string | null;
  completed_at: string | null;
}>;

export type ProgressQueryResult = Readonly<{
  overview: ProgressOverview;
  error?: string;
}>;

const EMPTY_OVERVIEW: ProgressOverview = {
  source: "supabase",
  overallCompletion: 0,
  totalActivities: 0,
  completedActivities: 0,
  pendingActivities: 0,
  completedPomodoros: 0,
  plannedFocusMinutes: 0,
  actualFocusMinutes: 0,
  activities: [],
  categoryProgress: [],
  dailyFocus: [],
  evaluations: [],
};

const CATEGORY_LABELS: Record<ActivityProgressItem["category"], string> = {
  academic: "Académicas",
  work: "Laborales",
  personal: "Personales",
};

function percentageAverage(items: readonly ActivityProgressItem[]) {
  if (items.length === 0) {
    return 0;
  }

  return Math.round(
    items.reduce((total, item) => total + item.completionPercentage, 0) /
      items.length,
  );
}

function limaDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function addDays(dateKey: string, amount: number) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function createDailyFocus(
  sessions: readonly DailyPomodoroRow[],
  today = new Date(),
): DailyFocusItem[] {
  const todayKey = limaDateKey(today);
  const minutesByDate = new Map<string, number>();

  for (const session of sessions) {
    const dateKey = limaDateKey(new Date(session.ended_at));
    minutesByDate.set(
      dateKey,
      (minutesByDate.get(dateKey) ?? 0) + session.elapsed_seconds / 60,
    );
  }

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(todayKey, index - 6);
    const label = new Intl.DateTimeFormat("es-PE", {
      weekday: "short",
      timeZone: "UTC",
    })
      .format(new Date(`${date}T00:00:00Z`))
      .replace(".", "");

    return {
      date,
      label,
      minutes: Math.round(minutesByDate.get(date) ?? 0),
    };
  });
}

function createCategoryProgress(
  activities: readonly ActivityProgressItem[],
): CategoryProgressItem[] {
  return (Object.keys(CATEGORY_LABELS) as ActivityProgressItem["category"][])
    .map((category) => {
      const categoryActivities = activities.filter(
        (activity) => activity.category === category,
      );

      return {
        category,
        label: CATEGORY_LABELS[category],
        activityCount: categoryActivities.length,
        completionPercentage: percentageAverage(categoryActivities),
      } satisfies CategoryProgressItem;
    })
    .filter((item) => item.activityCount > 0);
}

function createEvaluationProgress(
  files: readonly UploadedFileSummaryRow[],
  evaluations: readonly EvaluationSummaryRow[],
  activities: readonly ActivityProgressItem[],
): EvaluationProgressItem[] {
  const activityById = new Map(
    activities.map((activity) => [activity.id, activity]),
  );
  const evaluationByFileId = new Map(
    evaluations.map((evaluation) => [evaluation.file_id, evaluation]),
  );

  return files.flatMap((file) => {
    const activity = activityById.get(file.activity_id);

    if (!activity || activity.category !== "academic") {
      return [];
    }

    const evaluation = evaluationByFileId.get(file.id);
    const numericScore =
      evaluation?.score === null || evaluation?.score === undefined
        ? null
        : Number(evaluation.score);

    return [
      {
        id: evaluation?.id ?? null,
        fileId: file.id,
        activityId: file.activity_id,
        activityTitle: activity.title,
        fileName: file.original_name,
        status: evaluation?.status ?? "not_requested",
        score: numericScore,
        level:
          numericScore === null ? null : getEvaluationLevel(numericScore),
        feedback: evaluation?.feedback ?? null,
        completedAt: evaluation?.completed_at ?? null,
      } satisfies EvaluationProgressItem,
    ];
  });
}

async function getDemoOverview(): Promise<ProgressOverview> {
  const state = await readDemoState();
  const activities = state.activities.map((activity) => {
    const blocks = state.blocks.filter((block) => block.activityId === activity.id && block.blockType !== "break");
    const completed = blocks.filter((block) => block.status === "completed").length;
    const completionPercentage = blocks.length ? Math.floor(completed * 100 / blocks.length) : 0;
    return { ...activity, completionPercentage, isCompleted: completionPercentage === 100 };
  });
  const sessions = state.sessions.filter((session) => session.status === "completed" && session.sessionType === "focus");
  const completedActivities = activities.filter((activity) => activity.isCompleted).length;
  return {
    source: "demo", overallCompletion: percentageAverage(activities), totalActivities: activities.length,
    completedActivities, pendingActivities: activities.length - completedActivities,
    completedPomodoros: sessions.length,
    plannedFocusMinutes: state.blocks.filter((block) => block.blockType !== "break").reduce((total, block) => total + block.plannedMinutes, 0),
    actualFocusMinutes: Math.round(sessions.reduce((total, session) => total + session.elapsedSeconds, 0) / 60),
    activities, categoryProgress: createCategoryProgress(activities),
    dailyFocus: createDailyFocus(sessions.filter((session) => session.endedAt).map((session) => ({ elapsed_seconds: session.elapsedSeconds, ended_at: session.endedAt! }))),
    evaluations: createEvaluationProgress(state.files.map((file) => ({ id: file.id, activity_id: file.activityId, original_name: file.originalName })), [], activities),
  };
}

export async function getProgressOverview(): Promise<ProgressQueryResult> {
  if (isDemoMode()) {
    return { overview: await getDemoOverview() };
  }

  if (!hasSupabasePublicEnv()) {
    return {
      overview: EMPTY_OVERVIEW,
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
        overview: EMPTY_OVERVIEW,
        error: "No se pudo validar tu sesión.",
      };
    }

    const [
      activitiesResult,
      planResult,
      filesResult,
      evaluationsResult,
    ] = await Promise.all([
      supabase
        .from("activities")
        .select(
          "id, title, category, activity_date, start_time, end_time, priority, created_at",
        )
        .eq("user_id", userId)
        .order("activity_date", { ascending: true }),
      supabase
        .from("study_plans")
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("uploaded_files")
        .select("id, activity_id, original_name")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("evaluations")
        .select(
          "id, activity_id, file_id, status, score, feedback, completed_at",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

    if (
      activitiesResult.error ||
      planResult.error ||
      filesResult.error ||
      evaluationsResult.error
    ) {
      return {
        overview: EMPTY_OVERVIEW,
        error: "No se pudieron cargar tus resultados de progreso.",
      };
    }

    const progressByActivity = new Map<string, { completion_percentage: number; is_completed: boolean }>();

    let completedPomodoros = 0;
    let plannedFocusMinutes = 0;
    let actualFocusMinutes = 0;
    const firstChartDate = addDays(limaDateKey(new Date()), -6);
    const { data: dailySessionData, error: dailySessionError } = await supabase
      .from("pomodoro_sessions")
      .select("elapsed_seconds, ended_at")
      .eq("user_id", userId)
      .eq("session_type", "focus")
      .eq("status", "completed")
      .gte("ended_at", `${firstChartDate}T00:00:00-05:00`);

    if (dailySessionError) {
      return {
        overview: EMPTY_OVERVIEW,
        error: "No se pudo calcular la tendencia semanal de enfoque.",
      };
    }

    if (planResult.data) {
      const { data: blockData, error: blockError } = await supabase
        .from("plan_blocks")
        .select("id, activity_id, block_type, planned_minutes, status")
        .eq("user_id", userId)
        .eq("plan_id", planResult.data.id);

      if (blockError) {
        return {
          overview: EMPTY_OVERVIEW,
          error: "No se pudo calcular el tiempo del plan más reciente.",
        };
      }

      const blocks = blockData as PlanBlockSummaryRow[];
      const focusBlocks = blocks.filter((block) => block.block_type !== "break");
      for (const activityId of new Set(focusBlocks.map((block) => block.activity_id))) {
        if (!activityId) continue;
        const activityBlocks = focusBlocks.filter((block) => block.activity_id === activityId);
        const completed = activityBlocks.filter((block) => block.status === "completed").length;
        const percentage = Math.floor(completed * 100 / activityBlocks.length);
        progressByActivity.set(activityId, { completion_percentage: percentage, is_completed: percentage === 100 });
      }
      plannedFocusMinutes = focusBlocks.reduce(
        (total, block) => total + block.planned_minutes,
        0,
      );

      if (blocks.length > 0) {
        const { data: sessionData, error: sessionError } = await supabase
          .from("pomodoro_sessions")
          .select("session_type, status, elapsed_seconds")
          .eq("user_id", userId)
          .in(
            "plan_block_id",
            blocks.map((block) => block.id),
          );

        if (sessionError) {
          return {
            overview: EMPTY_OVERVIEW,
            error: "No se pudieron calcular las sesiones Pomodoro.",
          };
        }

        const completedFocusSessions = (
          sessionData as PomodoroSummaryRow[]
        ).filter(
          (session) =>
            session.session_type === "focus" &&
            session.status === "completed",
        );
        completedPomodoros = completedFocusSessions.length;
        actualFocusMinutes = Math.round(
          completedFocusSessions.reduce(
            (total, session) => total + session.elapsed_seconds,
            0,
          ) / 60,
        );
      }
    }

    const activities = (activitiesResult.data as ActivityRow[]).map(
      (activity) => {
        const progress = progressByActivity.get(activity.id);

        return {
          id: activity.id,
          title: activity.title,
          category: activity.category,
          priority: activity.priority,
          activityDate: activity.activity_date,
          completionPercentage: progress?.completion_percentage ?? 0,
          isCompleted: progress?.is_completed ?? false,
        } satisfies ActivityProgressItem;
      },
    );

    const completedActivities = activities.filter(
      (activity) => activity.isCompleted,
    ).length;

    return {
      overview: {
        source: "supabase",
        overallCompletion: percentageAverage(activities),
        totalActivities: activities.length,
        completedActivities,
        pendingActivities: activities.length - completedActivities,
        completedPomodoros,
        plannedFocusMinutes,
        actualFocusMinutes,
        activities,
        categoryProgress: createCategoryProgress(activities),
        dailyFocus: createDailyFocus(
          (dailySessionData as DailyPomodoroRow[]).filter(
            (session) => Boolean(session.ended_at),
          ),
        ),
        evaluations: createEvaluationProgress(
          filesResult.data as UploadedFileSummaryRow[],
          evaluationsResult.data as EvaluationSummaryRow[],
          activities,
        ),
      },
    };
  } catch {
    return {
      overview: EMPTY_OVERVIEW,
      error: "Supabase no está disponible en este momento.",
    };
  }
}

