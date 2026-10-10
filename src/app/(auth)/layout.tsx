import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { PublicShell } from "@/components/layout/public-shell";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

async function RedirectAuthenticatedUser() {
  await connection();

  if (!hasSupabasePublicEnv()) {
    return null;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (data?.claims) {
    redirect("/activities");
  }

  return null;
}

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Suspense fallback={null}>
        <RedirectAuthenticatedUser />
      </Suspense>
      <PublicShell>{children}</PublicShell>
    </>
  );
}
