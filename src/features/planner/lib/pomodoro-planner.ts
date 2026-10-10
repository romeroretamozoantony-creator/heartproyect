import type { Activity } from "@/features/activities/types/activity";
import type { GeneratedPlanBlock } from "@/features/planner/types/study-plan";
import type { ActivitySchedule } from "@/features/schedule/types/activity-schedule";

const FOCUS_MINUTES = 25;
const SHORT_BREAK_MINUTES = 5;
const LIMA_OFFSET = "-05:00";

type PlannerInput = Readonly<{
  activities: readonly Activity[];
  schedules: readonly ActivitySchedule[];
  now?: Date;
}>;

export type GeneratedStudyPlan = Readonly<{
  name: string;
  blocks: GeneratedPlanBlock[];
}>;

function limaDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );

  return `${value.year}-${value.month}-${value.day}`;
}

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function weekdayIndex(dateKey: string) {
  const sundayBased = new Date(`${dateKey}T00:00:00Z`).getUTCDay();
  return (sundayBased + 6) % 7;
}

function nextDateForWeekday(
  baseDate: string,
  dayOfWeek: number,
  startTime: string,
  now: Date,
) {
  const difference = (dayOfWeek - weekdayIndex(baseDate) + 7) % 7;
  let date = addDays(baseDate, difference);
  let scheduled = new Date(`${date}T${startTime}:00${LIMA_OFFSET}`);

  if (scheduled.getTime() <= now.getTime()) {
    date = addDays(date, 7);
    scheduled = new Date(`${date}T${startTime}:00${LIMA_OFFSET}`);
  }

  return scheduled;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

export function generatePomodoroPlan({
  activities,
  schedules,
  now = new Date(),
}: PlannerInput): GeneratedStudyPlan {
  const activityById = new Map(
    activities.map((activity) => [activity.id, activity]),
  );
  const today = limaDateKey(now);
  const sessions = schedules
    .map((schedule) => {
      const activity = activityById.get(schedule.activityId);

      if (!activity) {
        throw new Error("El cronograma contiene una actividad no disponible.");
      }

      return {
        activity,
        schedule,
        start: nextDateForWeekday(
          today,
          schedule.dayOfWeek,
          activity.startTime,
          now,
        ),
      };
    })
    .sort((first, second) => first.start.getTime() - second.start.getTime());
  const blocks: GeneratedPlanBlock[] = [];

  for (const session of sessions) {
    let cursor = session.start;
    let remainingMinutes = session.schedule.allocatedMinutes;
    let focusNumber = 1;

    while (remainingMinutes > 0) {
      const focusMinutes = Math.min(FOCUS_MINUTES, remainingMinutes);
      const focusEnd = addMinutes(cursor, focusMinutes);

      blocks.push({
        activityId: session.activity.id,
        blockType: "study",
        position: blocks.length,
        title: `${session.activity.title} · Concentración ${focusNumber}`,
        scheduledStart: cursor.toISOString(),
        scheduledEnd: focusEnd.toISOString(),
        plannedMinutes: focusMinutes,
      });

      remainingMinutes -= focusMinutes;
      cursor = focusEnd;

      if (remainingMinutes > 0) {
        const breakEnd = addMinutes(cursor, SHORT_BREAK_MINUTES);

        blocks.push({
          activityId: session.activity.id,
          blockType: "break",
          position: blocks.length,
          title: `Descanso · ${session.activity.title}`,
          scheduledStart: cursor.toISOString(),
          scheduledEnd: breakEnd.toISOString(),
          plannedMinutes: SHORT_BREAK_MINUTES,
        });
        cursor = breakEnd;
        focusNumber += 1;
      }
    }
  }

  if (blocks.length === 0) {
    throw new Error("El cronograma no contiene tiempo para generar un plan.");
  }

  const planDate = new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeZone: "America/Lima",
  }).format(now);

  return {
    name: `Plan Pomodoro · ${planDate}`,
    blocks,
  };
}
