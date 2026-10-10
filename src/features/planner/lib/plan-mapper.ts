import type {
  PlanBlock,
  PlanBlockRow,
  StudyPlan,
  StudyPlanRow,
} from "@/features/planner/types/study-plan";

export function mapStudyPlanRow(row: StudyPlanRow): StudyPlan {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    confirmedAt: row.confirmed_at,
    createdAt: row.created_at,
  };
}

export function mapPlanBlockRow(row: PlanBlockRow): PlanBlock {
  return {
    id: row.id,
    activityId: row.activity_id,
    blockType: row.block_type,
    position: row.position,
    title: row.title,
    scheduledStart: row.scheduled_start,
    scheduledEnd: row.scheduled_end,
    plannedMinutes: row.planned_minutes,
    status: row.status,
  };
}
