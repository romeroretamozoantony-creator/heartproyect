export type UploadedFile = Readonly<{
  id: string;
  activityId: string;
  objectPath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}>;

export type UploadedFileRow = Readonly<{
  id: string;
  activity_id: string;
  object_path: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}>;
