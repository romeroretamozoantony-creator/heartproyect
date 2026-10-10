import type {
  Activity,
  ActivityRow,
} from "@/features/activities/types/activity";

function formatTime(value: string | null) {
  return value ? value.slice(0, 5) : null;
}

export function mapActivityRow(row: ActivityRow): Activity {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    kind: row.kind,
    activityDate: row.activity_date,
    startTime: formatTime(row.start_time),
    endTime: formatTime(row.end_time),
    priority: row.priority,
    createdAt: row.created_at,
  };
}
