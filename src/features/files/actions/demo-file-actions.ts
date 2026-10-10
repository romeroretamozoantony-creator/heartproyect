"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { readDemoState, mutateDemoState, removeDemoFileBytes, saveDemoFileBytes } from "@/features/demo/store";
import type { DeleteFileResult, FileOperationResult } from "@/features/files/lib/file-storage";

export async function uploadDemoFile(form: FormData): Promise<FileOperationResult> {
  try {
    const activityId = form.get("activityId");
    const file = form.get("file");
    if (!z.uuid().safeParse(activityId).success || !(file instanceof File)) return { status: "error", message: "Selecciona una actividad y un archivo válidos." };
    if (file.size < 1 || file.size > 10 * 1024 * 1024 || !file.name.trim() || file.name.length > 255) return { status: "error", message: "El archivo debe tener contenido y pesar como máximo 10 MB." };
    const state = await readDemoState();
    if (!state.activities.some((activity) => activity.id === activityId)) return { status: "error", message: "La actividad no está disponible." };
    const uploaded = {
      id: crypto.randomUUID(), activityId: activityId as string,
      objectPath: "demo-local", originalName: file.name,
      mimeType: file.type || "application/octet-stream", sizeBytes: file.size, createdAt: new Date().toISOString(),
    };
    await saveDemoFileBytes(uploaded.id, new Uint8Array(await file.arrayBuffer()));
    try { await mutateDemoState((state) => {
      if (!state.activities.some((activity) => activity.id === activityId)) throw new Error("La actividad ya no está disponible.");
      state.files.unshift(uploaded);
    }); } catch (error) { await removeDemoFileBytes(uploaded.id); throw error; }
    revalidatePath("/schedule");
    revalidatePath("/progress");
    return { status: "success", message: "Archivo guardado en la demostración local.", file: uploaded };
  } catch {
    return { status: "error", message: "No se pudo guardar el archivo en la demostración local." };
  }
}

export async function deleteDemoFile(fileId: string): Promise<DeleteFileResult> {
  try {
    if (!z.uuid().safeParse(fileId).success) return { status: "error", message: "Archivo no válido." };
    await mutateDemoState((state) => {
      if (!state.files.some((file) => file.id === fileId)) throw new Error("Archivo no disponible.");
      state.files = state.files.filter((file) => file.id !== fileId);
    });
    await removeDemoFileBytes(fileId);
    revalidatePath("/schedule");
    revalidatePath("/progress");
    return { status: "success", message: "Archivo eliminado de la demostración local." };
  } catch {
    return { status: "error", message: "No se pudo eliminar el archivo." };
  }
}
