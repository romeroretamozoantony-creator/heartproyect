import "server-only";

import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { cookies } from "next/headers";

import type { Activity } from "@/features/activities/types/activity";
import { DEMO_SESSION_COOKIE, isDemoSessionId } from "@/features/demo/config";
import { validDemoSessionDirectory } from "@/features/demo/session-registry";
import { DEMO_ACTIVITIES, DEMO_SCHEDULES } from "@/features/demo/data";
import type { UploadedFile } from "@/features/files/types/uploaded-file";
import type { PlanBlock, StudyPlan } from "@/features/planner/types/study-plan";
import type { PomodoroSession } from "@/features/pomodoro/types/pomodoro-session";
import type { ActivitySchedule } from "@/features/schedule/types/activity-schedule";

export type DemoState = {
  activities: Activity[];
  schedules: ActivitySchedule[];
  files: UploadedFile[];
  plan: StudyPlan | null;
  blocks: PlanBlock[];
  sessions: PomodoroSession[];
};

async function sessionDirectory() {
  const path = validDemoSessionDirectory((await cookies()).get(DEMO_SESSION_COOKIE)?.value);
  if (!path) throw new Error("Tu sesión de demostración ha vencido. Inicia sesión nuevamente.");
  return path;
}

function load(path: string): DemoState {
  const file = join(path, "state.json");
  return existsSync(file)
    ? JSON.parse(readFileSync(file, "utf8")) as DemoState
    : { activities: [...DEMO_ACTIVITIES], schedules: [...DEMO_SCHEDULES], files: [], plan: null, blocks: [], sessions: [] };
}

export async function readDemoState() {
  return load(await sessionDirectory());
}

export async function mutateDemoState<T>(mutation: (state: DemoState) => T): Promise<T> {
  const path = await sessionDirectory();
  // No await entre lectura y escritura: las mutaciones locales son secuenciales.
  const state = load(path);
  const result = mutation(state);
  const temporary = join(path, `${crypto.randomUUID()}.tmp`);
  writeFileSync(temporary, JSON.stringify(state), { mode: 0o600 });
  renameSync(temporary, join(path, "state.json"));
  return result;
}

export async function saveDemoFileBytes(id: string, bytes: Uint8Array) {
  if (!isDemoSessionId(id)) throw new Error("Archivo no válido.");
  writeFileSync(join(await sessionDirectory(), id), bytes, { mode: 0o600 });
}

export async function removeDemoFileBytes(id: string) {
  if (!isDemoSessionId(id)) throw new Error("Archivo no válido.");
  rmSync(join(await sessionDirectory(), id), { force: true });
}
