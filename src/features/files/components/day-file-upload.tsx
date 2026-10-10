"use client";

import { FileText, FileUp, LoaderCircle, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  deleteActivityFile,
  uploadActivityFile,
} from "@/features/files/lib/file-storage";
import type { UploadedFile } from "@/features/files/types/uploaded-file";

type DayFileUploadProps = Readonly<{
  demoMode: boolean;
  activityId: string;
  disabled: boolean;
  files: readonly UploadedFile[];
  onUploaded: (file: UploadedFile) => void;
  onDeleted: (fileId: string) => void;
}>;

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  }

  return `${new Intl.NumberFormat("es-PE", {
    maximumFractionDigits: 1,
  }).format(sizeBytes / (1024 * 1024))} MB`;
}

export function DayFileUpload({
  demoMode,
  activityId,
  disabled,
  files,
  onUploaded,
  onDeleted,
}: DayFileUploadProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [result, setResult] = useState<{
    status: "error" | "success";
    message: string;
  } | null>(null);

  const canUpload = !disabled && Boolean(activityId) && !isUploading;

  async function handleFileChange() {
    const selectedFile = fileInput.current?.files?.[0];

    if (!selectedFile || !activityId) {
      return;
    }

    setIsUploading(true);
    setResult(null);
    const nextResult = await uploadActivityFile(activityId, selectedFile, demoMode);
    setResult(nextResult);

    if (nextResult.status === "success") {
      onUploaded(nextResult.file);
    }

    if (fileInput.current) {
      fileInput.current.value = "";
    }
    setIsUploading(false);
  }

  async function removeFile(file: UploadedFile) {
    setDeletingId(file.id);
    setResult(null);
    const nextResult = await deleteActivityFile(file, demoMode);
    setResult(nextResult);

    if (nextResult.status === "success") {
      onDeleted(file.id);
    }

    setDeletingId(null);
  }

  return (
    <div className="space-y-3 rounded-xl border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Documentos del día</p>
        <Button
          disabled={!canUpload}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => fileInput.current?.click()}
        >
          {isUploading ? (
            <LoaderCircle aria-hidden="true" className="animate-spin" />
          ) : (
            <FileUp aria-hidden="true" />
          )}
          {isUploading ? "Subiendo..." : "Subir documento"}
        </Button>
        <input
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg"
          className="sr-only"
          disabled={!canUpload}
          onChange={handleFileChange}
          ref={fileInput}
          tabIndex={-1}
          type="file"
        />
      </div>

      {disabled || !activityId ? (
        <p className="text-xs text-muted-foreground">
          Selecciona una actividad para subir documentos a este día.
        </p>
      ) : null}

      {result ? (
        <p
          className={`text-xs ${result.status === "error" ? "text-destructive" : "text-muted-foreground"}`}
          role={result.status === "error" ? "alert" : undefined}
        >
          {result.message}
        </p>
      ) : null}

      {files.length > 0 ? (
        <ul className="space-y-2">
          {files.map((file) => (
            <li className="flex items-center justify-between gap-2 text-sm" key={file.id}>
              <span className="flex min-w-0 items-center gap-2">
                <FileText aria-hidden="true" className="size-4 shrink-0" />
                <span className="truncate">{file.originalName}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatFileSize(file.sizeBytes)}
                </span>
              </span>
              <Button
                aria-label={`Eliminar ${file.originalName}`}
                disabled={deletingId === file.id}
                size="icon-sm"
                type="button"
                variant="ghost"
                onClick={() => removeFile(file)}
              >
                {deletingId === file.id ? (
                  <LoaderCircle aria-hidden="true" className="animate-spin" />
                ) : (
                  <Trash2 aria-hidden="true" />
                )}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
