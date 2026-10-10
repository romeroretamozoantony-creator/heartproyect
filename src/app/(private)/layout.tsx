import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { isDemoMode } from "@/features/demo/mode";
import { DEMO_SESSION_COOKIE } from "@/features/demo/config";
import { validDemoSessionDirectory } from "@/features/demo/session-registry";
import { hasSupabasePublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

async function AuthenticatedApp({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await connection();

  if (isDemoMode()) {
    const cookieStore = await cookies();

    if (validDemoSessionDirectory(cookieStore.get(DEMO_SESSION_COOKIE)?.value)) {
      return <AppShell>{children}</AppShell>;
    }

    redirect("/login");
  }

  if (!hasSupabasePublicEnv()) {
    redirect("/login?auth_error=configuration");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }

  return <AppShell>{children}</AppShell>;
}

export default function PrivateLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center p-6 text-sm text-muted-foreground">
          Verificando sesión...
        </main>
      }
    >
      <AuthenticatedApp>{children}</AuthenticatedApp>
    </Suspense>
  );
}
