import "server-only";

import { env } from "node:process";

// Lee el entorno real del servidor; Next no debe fijar estos indicadores al compilar.
export function isDemoMode() {
  return env.DEMO_MODE === "true" && Reflect.get(env, "NEXT_PUBLIC_DEMO_MODE") === "true"
    && (env.NODE_ENV !== "production" || env.ALLOW_DEMO_IN_PRODUCTION === "true");
}
