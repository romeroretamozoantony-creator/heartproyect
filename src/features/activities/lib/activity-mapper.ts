import type {
  Activity,
  ActivityRow,
} from "@/features/activities/types/activity";

function formatTime(value: string) {
  return value.slice(0, 5);
}

export function mapActivityRow(row: ActivityRow): Activity {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    activityDate: row.activity_date,
    startTime: formatTime(row.start_time),
    endTime: formatTime(row.end_time),
    priority: row.priority,
    createdAt: row.created_at,
  };
}
