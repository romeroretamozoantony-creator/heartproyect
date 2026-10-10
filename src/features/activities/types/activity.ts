import type { ActivityFormValues } from "@/features/activities/schemas/activity-schema";

export type ActivityKind = "registro" | "rutina";

export type Activity = Readonly<{
  id: string;
  title: string;
  category: ActivityFormValues["category"];
  kind: ActivityKind;
  activityDate: string | null;
  startTime: string | null;
  endTime: string | null;
  priority: ActivityFormValues["priority"];
  createdAt: string;
}>;

export type ActivityRow = Readonly<{
  id: string;
  title: string;
  category: ActivityFormValues["category"];
  kind: ActivityKind;
  activity_date: string | null;
  start_time: string | null;
  end_time: string | null;
  priority: ActivityFormValues["priority"];
  created_at: string;
}>;
