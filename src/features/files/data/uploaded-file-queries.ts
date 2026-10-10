import "server-only";

import { mapUploadedFileRow } from "@/features/files/lib/uploaded-file-mapper";
import type {
  UploadedFile,
  UploadedFileRow,
} from "@/features/files/types/uploaded-file";
import { isDemoMode } from "@/features/demo/mode";
import { readDemoState } from "@/features/demo/store";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type UploadedFilesQueryResult = Readonly<{
  files: UploadedFile[];
  error?: string;
}>;

export async function getUploadedFiles(): Promise<UploadedFilesQueryResult> {
  if (isDemoMode()) {
    return { files: (await readDemoState()).files };
  }

  if (!hasSupabasePublicEnv()) {
    return {
      files: [],
      error:
        "Supabase todavía no está configurado. Completa las variables de .env.local.",
    };
  }

  try {
    const supabase = await createClient();
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;

    if (claimsError || !userId) {
      return { files: [], error: "No se pudo validar tu sesión." };
    }

    const { data, error } = await supabase
      .from("uploaded_files")
      .select(
        "id, activity_id, day_of_week, object_path, original_name, mime_type, size_bytes, created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return { files: [], error: "No se pudieron cargar los archivos." };
    }

    return {
      files: (data as UploadedFileRow[]).map(mapUploadedFileRow),
    };
  } catch {
    return {
      files: [],
      error: "Supabase no está disponible en este momento.",
    };
  }
}
