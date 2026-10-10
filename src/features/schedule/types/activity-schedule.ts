export type ActivitySchedule = Readonly<{
  id: string;
  activityId: string;
  dayOfWeek: number;
  allocatedMinutes: number;
  startTime: string | null;
  alertBeforeStartMinutes: number | null;
  alertOnEnd: boolean;
}>;

export type ActivityScheduleRow = Readonly<{
  id: string;
  activity_id: string;
  day_of_week: number;
  allocated_minutes: number;
  start_time: string | null;
  alert_before_start_minutes: number | null;
  alert_on_end: boolean;
}>;
