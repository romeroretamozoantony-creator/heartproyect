import type { Activity } from "@/features/activities/types/activity";
import type { GeneratedPlanBlock } from "@/features/planner/types/study-plan";
import type { ActivitySchedule } from "@/features/schedule/types/activity-schedule";

export const PLAN_TIME_ZONE = "America/Lima";

const FOCUS_MINUTES = 25;
const SHORT_BREAK_MINUTES = 5;

type PlannerInput = Readonly<{
  activities: readonly Activity[];
  schedules: readonly ActivitySchedule[];
  now?: Date;
}>;

export type GeneratedStudyPlan = Readonly<{
  name: string;
  blocks: GeneratedPlanBlock[];
}>;

function zonedParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PLAN_TIME_ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  return Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );
}

export function dateKeyInPlanZone(date: Date) {
  const { year, month, day } = zonedParts(date);

  return `${year}-${month}-${day}`;
}

function zoneOffsetMs(instant: Date) {
  const { year, month, day, hour, minute, second } = zonedParts(instant);
  const wallClockAsUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );

  return wallClockAsUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

function zonedInstant(dateKey: string, time: string) {
  const wallClockAsUtc = Date.parse(`${dateKey}T${time}:00Z`);

  return new Date(wallClockAsUtc - zoneOffsetMs(new Date(wallClockAsUtc)));
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

function nextOccurrence(
  baseDate: string,
  dayOfWeek: number,
  startTime: string,
  now: Date,
) {
  const difference = (dayOfWeek - weekdayIndex(baseDate) + 7) % 7;
  let dateKey = addDays(baseDate, difference);
  let start = zonedInstant(dateKey, startTime);

  if (start.getTime() <= now.getTime()) {
    dateKey = addDays(dateKey, 7);
    start = zonedInstant(dateKey, startTime);
  }

  return { dateKey, start };
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function assertNoOverlaps(blocks: readonly GeneratedPlanBlock[]) {
  const ordered = [...blocks].sort(
    (first, second) =>
      Date.parse(first.scheduledStart) - Date.parse(second.scheduledStart),
  );

  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];

    if (Date.parse(current.scheduledStart) < Date.parse(previous.scheduledEnd)) {
      throw new Error(
        `Los bloques "${previous.title}" y "${current.title}" se solapan. Ajusta la hora de inicio o la duración en el cronograma.`,
      );
    }
  }
}

export function generatePomodoroPlan({
  activities,
  schedules,
  now = new Date(),
}: PlannerInput): GeneratedStudyPlan {
  const activityById = new Map(
    activities.map((activity) => [activity.id, activity]),
  );
  const today = dateKeyInPlanZone(now);
  const sessions = schedules
    .map((schedule) => {
      const activity = activityById.get(schedule.activityId);

      if (!activity) {
        throw new Error("El cronograma contiene una actividad no disponible.");
      }

      return {
        activity,
        schedule,
        ...nextOccurrence(today, schedule.dayOfWeek, activity.startTime, now),
      };
    })
    .filter(
      ({ activity, dateKey }) =>
        !activity.activityDate || dateKey <= activity.activityDate,
    )
    .sort((first, second) => first.start.getTime() - second.start.getTime());

  if (sessions.length === 0) {
    throw new Error(
      "Ninguna sesión del cronograma ocurre antes de la fecha de sus actividades.",
    );
  }

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

  assertNoOverlaps(blocks);

  const planDate = new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeZone: PLAN_TIME_ZONE,
  }).format(now);

  return {
    name: `Plan Pomodoro · ${planDate}`,
    blocks,
  };
}
