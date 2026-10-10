import type { createClient } from "@/lib/supabase/server";

export type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export async function getAuthenticatedUserId(supabase: ServerSupabase) {
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  return error || !userId ? null : userId;
}
