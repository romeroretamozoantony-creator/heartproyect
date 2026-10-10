import Link from "next/link";
import { HeartPulse } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-6 py-16">
      <section className="w-full max-w-xl rounded-2xl border bg-card p-8 text-center shadow-sm">
        <HeartPulse
          aria-hidden="true"
          className="mx-auto mb-5 size-12 text-primary"
        />
        <h1 className="text-3xl font-semibold tracking-tight">Mobile Heart</h1>
        <p className="mt-3 text-muted-foreground">
          Organización académica, planificación y bienestar estudiantil.
        </p>
        <Link
          className={buttonVariants({ className: "mt-7 h-10 px-5" })}
          href="/login"
        >
          Comenzar
        </Link>
      </section>
    </main>
  );
}
