import { ExternalLink, Info, ShieldCheck } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getSupportResources,
  WELLBEING_HABITS,
} from "@/features/wellbeing/data/wellbeing-content";

export function WellbeingSupportSection() {
  const resources = getSupportResources();

  return (
    <section aria-labelledby="wellbeing-title" className="space-y-4">
      <div>
        <h2 id="wellbeing-title" className="text-xl font-semibold">
          Bienestar y apoyo
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Recomendaciones generales para acompañar tu organización y canales a
          los que puedes acudir si necesitas orientación.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {WELLBEING_HABITS.map((habit) => {
          const Icon = habit.icon;

          return (
            <Card key={habit.title} size="sm">
              <CardHeader className="grid-cols-[1fr_auto] gap-3">
                <div>
                  <CardTitle>{habit.title}</CardTitle>
                  <CardDescription className="mt-1">
                    {habit.description}
                  </CardDescription>
                </div>
                <Icon
                  aria-hidden="true"
                  className="size-5 text-muted-foreground"
                />
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {resources.map((resource) => {
          const Icon = resource.icon;

          return (
            <Card key={resource.title}>
              <CardHeader>
                <div className="mb-2 w-fit rounded-lg bg-muted p-2">
                  <Icon
                    aria-hidden="true"
                    className="size-5 text-muted-foreground"
                  />
                </div>
                <CardTitle>{resource.title}</CardTitle>
                <CardDescription>{resource.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto space-y-4">
                <p className="text-sm">{resource.detail}</p>
                {resource.href ? (
                  <a
                    className="inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4"
                    href={resource.href}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {resource.linkLabel}
                    <ExternalLink aria-hidden="true" className="size-4" />
                  </a>
                ) : (
                  <p className="text-sm font-medium text-muted-foreground">
                    Recurso pendiente de configuración institucional
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="space-y-3 rounded-xl border bg-muted/40 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0"
          />
          <div>
            <h3 className="font-medium">Herramienta de apoyo</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Mobile Heart ayuda a organizar actividades y presenta orientación
              general. No evalúa, diagnostica ni sustituye la atención de un
              profesional de salud.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 border-t pt-3">
          <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            Si tú o alguien cercano se encuentra en riesgo inmediato o presenta
            conductas autolesivas, busca ayuda profesional urgente y acude al
            establecimiento de salud más cercano.
          </p>
        </div>
      </div>
    </section>
  );
}

