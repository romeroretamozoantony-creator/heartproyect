import type {
  ActivitySchedule,
  ActivityScheduleRow,
} from "@/features/schedule/types/activity-schedule";

export function mapActivityScheduleRow(
  row: ActivityScheduleRow,
): ActivitySchedule {
  return {
    id: row.id,
    activityId: row.activity_id,
    dayOfWeek: row.day_of_week,
    allocatedMinutes: row.allocated_minutes,
    alertBeforeStartMinutes: row.alert_before_start_minutes,
    alertOnEnd: row.alert_on_end,
  };
}
