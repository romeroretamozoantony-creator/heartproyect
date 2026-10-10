import type {
  UploadedFile,
  UploadedFileRow,
} from "@/features/files/types/uploaded-file";

export function mapUploadedFileRow(row: UploadedFileRow): UploadedFile {
  return {
    id: row.id,
    activityId: row.activity_id,
    dayOfWeek: row.day_of_week,
    objectPath: row.object_path,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
  };
}
