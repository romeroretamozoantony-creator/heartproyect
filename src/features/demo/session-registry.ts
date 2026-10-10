import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isDemoMode } from "@/features/demo/mode";
import { isDemoSessionId } from "@/features/demo/config";

const directory = join(tmpdir(), `mobile-heart-demo-${createHash("sha256").update(process.cwd()).digest("hex").slice(0, 16)}`);
export const DEMO_SESSION_SECONDS = 8 * 60 * 60;

export function validDemoSessionDirectory(id: string | undefined, now = Date.now()): string | null {
  if (!isDemoMode() || !isDemoSessionId(id)) return null;
  const path = join(directory, id);
  try {
    const { expiresAt } = JSON.parse(readFileSync(join(path, "session.json"), "utf8"));
    if (typeof expiresAt === "number" && expiresAt > now) return path;
    rmSync(path, { recursive: true, force: true });
  } catch { /* Las cookies desconocidas nunca crean una sesión. */ }
  return null;
}

export function issueDemoSession(now = Date.now()): string {
  if (!isDemoMode()) throw new Error("La demostración está desactivada.");
  const id = randomUUID();
  const path = join(directory, id);
  mkdirSync(path, { recursive: true, mode: 0o700 });
  writeFileSync(join(path, "session.json"), JSON.stringify({ expiresAt: now + DEMO_SESSION_SECONDS * 1000 }), { mode: 0o600 });
  return id;
}

export function revokeDemoSession(id: string | undefined) {
  if (isDemoSessionId(id)) rmSync(join(directory, id), { recursive: true, force: true });
}
