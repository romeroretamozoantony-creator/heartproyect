import { WEEKDAYS } from "@/features/schedule/schemas/weekly-schedule-schema";
import type { ScheduleDayValues } from "@/features/schedule/schemas/weekly-schedule-schema";
import type { ActivitySchedule } from "@/features/schedule/types/activity-schedule";

export function createScheduleDays(
  schedules: readonly ActivitySchedule[] = [],
): ScheduleDayValues[] {
  return WEEKDAYS.map((_, dayOfWeek) => {
    const saved = schedules.find(
      (schedule) => schedule.dayOfWeek === dayOfWeek,
    );

    return {
      dayOfWeek,
      enabled: Boolean(saved),
      activityId: saved?.activityId ?? "",
      allocatedMinutes: saved?.allocatedMinutes ?? 30,
      startTime: saved?.startTime ?? "",
      alertBeforeStartMinutes: saved?.alertBeforeStartMinutes ?? null,
      alertOnEnd: saved?.alertOnEnd ?? false,
    };
  });
}
