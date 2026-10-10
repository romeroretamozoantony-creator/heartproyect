import { HeartPulse, LogOut } from "lucide-react";
import Link from "next/link";

import { AppNavigation } from "@/components/layout/app-navigation";
import { Button } from "@/components/ui/button";
import { SITE_CONFIG } from "@/config/site";
import { signOut } from "@/features/auth/actions/auth-actions";

type AppShellProps = Readonly<{
  children: React.ReactNode;
}>;

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/activities"
              className="flex w-fit items-center gap-2 font-semibold"
            >
              <HeartPulse aria-hidden="true" className="size-5" />
              {SITE_CONFIG.name}
            </Link>
            <form action={signOut}>
              <Button type="submit" variant="ghost">
                <LogOut aria-hidden="true" data-icon="inline-start" />
                Cerrar sesión
              </Button>
            </form>
          </div>
          <AppNavigation />
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
