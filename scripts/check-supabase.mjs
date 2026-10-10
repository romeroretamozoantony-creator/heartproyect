import { validatePublicSupabaseEnv } from "./public-env.mjs";

const urlValue = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const keyValue = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

if (!urlValue || !keyValue) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local.",
  );
  process.exit(1);
}

let healthUrl;

try {
  validatePublicSupabaseEnv(urlValue, keyValue);
  healthUrl = new URL("/auth/v1/health", urlValue);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

try {
  const response = await fetch(healthUrl, {
    headers: {
      apikey: keyValue,
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Supabase respondió con estado ${response.status}.`);
  }

  console.log("Conexión con Supabase verificada correctamente.");
} catch (error) {
  const message = error instanceof Error ? error.message : "Error desconocido";
  console.error(`No se pudo conectar con Supabase: ${message}`);
  process.exit(1);
}
