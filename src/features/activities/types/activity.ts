import type { ActivityFormValues } from "@/features/activities/schemas/activity-schema";

export type Activity = Readonly<{
  id: string;
  title: string;
  category: ActivityFormValues["category"];
  activityDate: string;
  startTime: string;
  endTime: string;
  priority: ActivityFormValues["priority"];
  createdAt: string;
}>;

export type ActivityRow = Readonly<{
  id: string;
  title: string;
  category: ActivityFormValues["category"];
  activity_date: string;
  start_time: string;
  end_time: string;
  priority: ActivityFormValues["priority"];
  created_at: string;
}>;
