import { validatePublicSupabaseEnv } from "../../scripts/public-env.mjs";

export type SupabasePublicEnv = Readonly<{
  url: string;
  publishableKey: string;
}>;

export function hasSupabasePublicEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim(),
  );
}

export function getSupabasePublicEnv(): SupabasePublicEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    const missingVariables: string[] = [];

    if (!url) {
      missingVariables.push("NEXT_PUBLIC_SUPABASE_URL");
    }

    if (!publishableKey) {
      missingVariables.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    }

    throw new Error(
      `Faltan variables de entorno de Supabase: ${missingVariables.join(", ")}`,
    );
  }

  return validatePublicSupabaseEnv(url, publishableKey);
}
