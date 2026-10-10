"use client";

import { FileText, FileUp, LoaderCircle, Trash2 } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteActivityFile,
  uploadActivityFile,
} from "@/features/files/lib/file-storage";
import type { UploadedFile } from "@/features/files/types/uploaded-file";
import type { Activity } from "@/features/activities/types/activity";

type ActivityFileManagerProps = Readonly<{
  demoMode: boolean;
  activities: readonly Activity[];
  initialFiles: readonly UploadedFile[];
}>;

function activityTitle(activityId: string, activities: readonly Activity[]) {
  return (
    activities.find((activity) => activity.id === activityId)?.title ??
    "Actividad no disponible"
  );
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  }

  return `${new Intl.NumberFormat("es-PE", {
    maximumFractionDigits: 1,
  }).format(sizeBytes / (1024 * 1024))} MB`;
}

export function ActivityFileManager({
  demoMode,
  activities,
  initialFiles,
}: ActivityFileManagerProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<UploadedFile[]>([...initialFiles]);
  const [activityId, setActivityId] = useState(activities[0]?.id ?? "");
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [result, setResult] = useState<{
    status: "error" | "success";
    message: string;
  } | null>(null);

  async function uploadFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);

    const selectedFile = fileInput.current?.files?.[0];

    if (!activityId) {
      setResult({ status: "error", message: "Selecciona una actividad." });
      return;
    }

    if (!selectedFile) {
      setResult({ status: "error", message: "Selecciona un archivo." });
      return;
    }

    setIsUploading(true);
    const nextResult = await uploadActivityFile(activityId, selectedFile, demoMode);
    setResult(nextResult);

    if (nextResult.status === "success") {
      setFiles((current) => [nextResult.file, ...current]);

      if (fileInput.current) {
        fileInput.current.value = "";
      }
    }

    setIsUploading(false);
  }

  async function removeFile(file: UploadedFile) {
    setDeletingId(file.id);
    setResult(null);

    const nextResult = await deleteActivityFile(file, demoMode);
    setResult(nextResult);

    if (nextResult.status === "success") {
      setFiles((current) => current.filter((item) => item.id !== file.id));
      setPendingDeleteId(null);
    }

    setDeletingId(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileUp aria-hidden="true" className="size-5" />
          Archivos de estudio
        </CardTitle>
        <CardDescription>
          Adjunta documentos a una actividad. Los archivos son privados y el
          tamaño máximo permitido es de 10 MB.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form
          className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end"
          onSubmit={uploadFile}
        >
          <div className="space-y-2">
            <Label htmlFor="file-activity">Actividad relacionada</Label>
            <Select
              value={activityId}
              onValueChange={(value) => setActivityId(value ?? "")}
            >
              <SelectTrigger className="w-full" id="file-activity">
                <SelectValue placeholder="Selecciona una actividad" />
              </SelectTrigger>
              <SelectContent>
                {activities.map((activity) => (
                  <SelectItem key={activity.id} value={activity.id}>
                    {activity.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="activity-file">Archivo</Label>
            <Input id="activity-file" ref={fileInput} type="file" />
          </div>

          <Button disabled={isUploading} size="lg" type="submit">
            {isUploading ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" />
            ) : (
              <FileUp aria-hidden="true" />
            )}
            {isUploading ? "Subiendo..." : "Subir archivo"}
          </Button>
        </form>

        {result ? (
          <Alert variant={result.status === "error" ? "destructive" : "default"}>
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        ) : null}

        {files.length > 0 ? (
          <div className="space-y-3">
            {files.map((file) => {
              const isPendingDelete = pendingDeleteId === file.id;
              const isDeleting = deletingId === file.id;

              return (
                <article
                  className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                  key={file.id}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="rounded-lg bg-muted p-2">
                      <FileText aria-hidden="true" className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{file.originalName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {activityTitle(file.activityId, activities)} · {formatFileSize(file.sizeBytes)}
                      </p>
                    </div>
                  </div>

                  {isPendingDelete ? (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <span className="text-xs text-muted-foreground">
                        ¿Eliminar definitivamente?
                      </span>
                      <Button
                        disabled={isDeleting}
                        size="sm"
                        type="button"
                        variant="outline"
                        onClick={() => setPendingDeleteId(null)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        disabled={isDeleting}
                        size="sm"
                        type="button"
                        variant="destructive"
                        onClick={() => removeFile(file)}
                      >
                        {isDeleting ? (
                          <LoaderCircle
                            aria-hidden="true"
                            className="animate-spin"
                          />
                        ) : (
                          <Trash2 aria-hidden="true" />
                        )}
                        {isDeleting ? "Eliminando..." : "Confirmar"}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      type="button"
                      variant="destructive"
                      onClick={() => {
                        setResult(null);
                        setPendingDeleteId(file.id);
                      }}
                    >
                      <Trash2 aria-hidden="true" />
                      Eliminar
                    </Button>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed px-5 py-8 text-center text-sm text-muted-foreground">
            Todavía no hay archivos asociados a tus actividades.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
