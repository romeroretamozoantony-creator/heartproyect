import { uploadDemoFile, deleteDemoFile } from "@/features/files/actions/demo-file-actions";
import { refreshFilePages } from "@/features/files/actions/file-refresh-actions";
import { mapUploadedFileRow } from "@/features/files/lib/uploaded-file-mapper";
import type {
  UploadedFile,
  UploadedFileRow,
} from "@/features/files/types/uploaded-file";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";

export const STORAGE_BUCKET = "activity-files";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILE_NAME_LENGTH = 255;
const ALLOWED_MIME_TYPES: readonly string[] = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "image/png",
  "image/jpeg",
];

export type FileOperationResult =
  | Readonly<{ status: "success"; message: string; file: UploadedFile }>
  | Readonly<{ status: "error"; message: string }>;

export type DeleteFileResult = Readonly<{
  status: "error" | "success";
  message: string;
}>;

function safeObjectName(originalName: string) {
  const dotIndex = originalName.lastIndexOf(".");
  const rawStem = dotIndex > 0 ? originalName.slice(0, dotIndex) : originalName;
  const rawExtension = dotIndex > 0 ? originalName.slice(dotIndex + 1) : "";
  const stem = rawStem
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const extension = rawExtension.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);

  return `${crypto.randomUUID()}-${stem || "archivo"}${
    extension ? `.${extension.toLowerCase()}` : ""
  }`;
}

function validateFile(file: File) {
  if (file.size < 1) {
    return "El archivo está vacío.";
  }

  if (file.size > MAX_FILE_SIZE) {
    return "El archivo supera el límite de 10 MB.";
  }

  if (!file.name.trim() || file.name.length > MAX_FILE_NAME_LENGTH) {
    return "El nombre del archivo no es válido.";
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return "Tipo de archivo no permitido. Usa PDF, Word, PowerPoint, Excel, texto o imágenes PNG/JPG.";
  }

  return null;
}

export async function uploadActivityFile(
  activityId: string,
  file: File,
  demoMode: boolean,
): Promise<FileOperationResult> {
  if (!z.uuid().safeParse(activityId).success) return { status: "error", message: "La actividad seleccionada no es válida." };
  const validationError = validateFile(file);

  if (validationError) {
    return { status: "error", message: validationError };
  }

  if (demoMode) {
    const form = new FormData();
    form.set("activityId", activityId);
    form.set("file", file);
    return uploadDemoFile(form);
  }

  try {
    const supabase = createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (userError || !userId) {
      return {
        status: "error",
        message: "Tu sesión ha vencido. Inicia sesión nuevamente.",
      };
    }

    const { data: activity, error: activityError } = await supabase.from("activities")
      .select("id").eq("id", activityId).eq("user_id", userId).maybeSingle();
    if (activityError || !activity) return { status: "error", message: "La actividad no está disponible." };

    const objectPath = `${userId}/${activityId}/${safeObjectName(file.name)}`;
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(objectPath, file, {
        cacheControl: "3600",
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      return {
        status: "error",
        message: "No se pudo subir el archivo al almacenamiento privado.",
      };
    }

    const { data, error: metadataError } = await supabase
      .from("uploaded_files")
      .insert({
        user_id: userId,
        activity_id: activityId,
        storage_bucket: STORAGE_BUCKET,
        object_path: objectPath,
        original_name: file.name,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
      })
      .select(
        "id, activity_id, object_path, original_name, mime_type, size_bytes, created_at",
      )
      .single();

    if (metadataError || !data) {
      await supabase.storage.from(STORAGE_BUCKET).remove([objectPath]);

      return {
        status: "error",
        message: "No se pudo asociar el archivo con la actividad seleccionada.",
      };
    }

    await refreshFilePages();
    return {
      status: "success",
      message: "Archivo subido correctamente.",
      file: mapUploadedFileRow(data as UploadedFileRow),
    };
  } catch {
    return {
      status: "error",
      message: "Supabase no está disponible. Inténtalo nuevamente.",
    };
  }
}

export async function deleteActivityFile(
  file: UploadedFile,
  demoMode: boolean,
): Promise<DeleteFileResult> {
  if (demoMode) return deleteDemoFile(file.id);

  try {
    const supabase = createClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (userError || !userId) {
      return {
        status: "error",
        message: "Tu sesión ha vencido. Inicia sesión nuevamente.",
      };
    }

    if (!z.uuid().safeParse(file.id).success) return { status: "error", message: "El archivo seleccionado no es válido." };
    const { data: stored, error: lookupError } = await supabase.from("uploaded_files")
      .select("object_path, activity_id").eq("id", file.id).eq("user_id", userId).maybeSingle();
    if (lookupError || !stored || !stored.object_path.startsWith(`${userId}/${stored.activity_id}/`)) {
      return { status: "error", message: "El archivo no está disponible." };
    }

    const { data, error: metadataError } = await supabase
      .from("uploaded_files")
      .delete()
      .eq("id", file.id)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    if (metadataError || !data) {
      return {
        status: "error",
        message: "No se pudo eliminar el archivo.",
      };
    }

    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([stored.object_path]);

    await refreshFilePages();

    if (storageError) {
      return {
        status: "success",
        message: "El archivo se quitó del listado, pero no se pudo borrar del almacenamiento.",
      };
    }

    return { status: "success", message: "Archivo eliminado correctamente." };
  } catch {
    return {
      status: "error",
      message: "Supabase no está disponible. Inténtalo nuevamente.",
    };
  }
}
