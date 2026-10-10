export type UploadedFile = Readonly<{
  id: string;
  activityId: string;
  dayOfWeek: number | null;
  objectPath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}>;

export type UploadedFileRow = Readonly<{
  id: string;
  activity_id: string;
  day_of_week: number | null;
  object_path: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}>;
