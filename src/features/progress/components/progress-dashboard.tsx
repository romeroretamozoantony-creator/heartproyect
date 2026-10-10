import {
  CalendarClock,
  CheckCircle2,
  CircleDashed,
  Clock3,
  FlaskConical,
  Focus,
  ListTodo,
  Smile,
  TrendingUp,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EvaluationProgressSection } from "@/features/evaluations/components/evaluation-progress-section";
import type {
  ActivityProgressItem,
  ProgressOverview,
} from "@/features/progress/types/progress";
import { WellbeingSupportSection } from "@/features/wellbeing/components/wellbeing-support-section";

const CATEGORY_LABELS: Record<ActivityProgressItem["category"], string> = {
  academic: "Académica",
  work: "Laboral",
  personal: "Personal",
};

const PRIORITY_LABELS: Record<ActivityProgressItem["priority"], string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

function ActivityStatusBadge({
  activity,
}: Readonly<{ activity: ActivityProgressItem }>) {
  if (activity.isCompleted) {
    return (
      <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-950">
        <Smile aria-hidden="true" className="size-4" />
        Cumplida
      </div>
    );
  }

  if (activity.completionPercentage > 0) {
    return (
      <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-sky-300 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-950">
        <CircleDashed aria-hidden="true" className="size-4" />
        En progreso
      </div>
    );
  }

  return (
    <div className="inline-flex w-fit items-center gap-1.5 rounded-full border bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
      <Clock3 aria-hidden="true" className="size-4" />
      Pendiente
    </div>
  );
}

function formatMinutes(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0
    ? `${hours} h ${remainingMinutes} min`
    : `${hours} h`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function ProgressBar({ value }: Readonly<{ value: number }>) {
  const percentage = Math.min(100, Math.max(0, value));

  return (
    <div
      aria-label={`${percentage}% completado`}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={percentage}
      className="h-2.5 overflow-hidden rounded-full bg-muted"
      role="progressbar"
    >
      <div
        className="h-full rounded-full bg-primary transition-[width]"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

function CategoryChart({ overview }: Readonly<{ overview: ProgressOverview }>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Avance por categoría</CardTitle>
        <CardDescription>
          Promedio de cumplimiento según el tipo de actividad.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {overview.categoryProgress.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Registra actividades para comparar las categorías.
          </p>
        ) : (
          overview.categoryProgress.map((item) => (
            <div className="space-y-2" key={item.category}>
              <div className="flex items-center justify-between gap-4 text-sm">
                <span>
                  {item.label}{" "}
                  <span className="text-muted-foreground">
                    ({item.activityCount})
                  </span>
                </span>
                <span className="font-medium">
                  {item.completionPercentage}%
                </span>
              </div>
              <ProgressBar value={item.completionPercentage} />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function WeeklyFocusChart({ overview }: Readonly<{ overview: ProgressOverview }>) {
  const maximumMinutes = Math.max(
    1,
    ...overview.dailyFocus.map((item) => item.minutes),
  );
  const weeklyMinutes = overview.dailyFocus.reduce(
    (total, item) => total + item.minutes,
    0,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enfoque de los últimos 7 días</CardTitle>
        <CardDescription>
          {formatMinutes(weeklyMinutes)} de concentración registrada esta semana.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          aria-label={`Minutos de enfoque por día. Total: ${weeklyMinutes} minutos.`}
          className="grid h-52 grid-cols-7 items-end gap-2 sm:gap-3"
          role="img"
        >
          {overview.dailyFocus.map((item) => {
            const height = Math.max(
              item.minutes > 0 ? 12 : 2,
              Math.round((item.minutes / maximumMinutes) * 100),
            );

            return (
              <div
                className="flex h-full min-w-0 flex-col items-center justify-end gap-2"
                key={item.date}
                title={`${item.label}: ${item.minutes} minutos`}
              >
                <span className="text-xs font-medium tabular-nums">
                  {item.minutes}
                </span>
                <div className="flex h-32 w-full items-end rounded-md bg-muted/60 px-1">
                  <div
                    aria-hidden="true"
                    className="w-full rounded-sm bg-primary transition-[height]"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className="text-xs capitalize text-muted-foreground">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function ProgressDashboard({
  overview,
}: Readonly<{ overview: ProgressOverview }>) {
  const timeCompletion =
    overview.plannedFocusMinutes > 0
      ? Math.min(
          100,
          Math.round(
            (overview.actualFocusMinutes / overview.plannedFocusMinutes) * 100,
          ),
        )
      : 0;

  return (
    <div className="space-y-6">
      {overview.source === "demo" ? (
        <div className="flex items-start gap-3 rounded-xl border border-dashed bg-muted/40 p-4 text-sm">
          <FlaskConical aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>
            Estás viendo el avance registrado en tu demostración local. Al
            conectar Supabase, esta vista se actualizará con tus actividades y
            sesiones reales.
          </p>
        </div>
      ) : null}

      <section
        aria-label="Resumen de progreso"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        <Card>
          <CardHeader className="grid-cols-[1fr_auto] items-center gap-3">
            <div>
              <CardDescription>Cumplimiento general</CardDescription>
              <CardTitle className="mt-1 text-3xl">{overview.overallCompletion}%</CardTitle>
            </div>
            <TrendingUp aria-hidden="true" className="size-6 text-muted-foreground" />
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="grid-cols-[1fr_auto] items-center gap-3">
            <div>
              <CardDescription>Actividades cumplidas</CardDescription>
              <CardTitle className="mt-1 text-3xl">{overview.completedActivities}</CardTitle>
            </div>
            <CheckCircle2 aria-hidden="true" className="size-6 text-muted-foreground" />
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="grid-cols-[1fr_auto] items-center gap-3">
            <div>
              <CardDescription>Actividades pendientes</CardDescription>
              <CardTitle className="mt-1 text-3xl">{overview.pendingActivities}</CardTitle>
            </div>
            <ListTodo aria-hidden="true" className="size-6 text-muted-foreground" />
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="grid-cols-[1fr_auto] items-center gap-3">
            <div>
              <CardDescription>Pomodoros realizados</CardDescription>
              <CardTitle className="mt-1 text-3xl">{overview.completedPomodoros}</CardTitle>
            </div>
            <Focus aria-hidden="true" className="size-6 text-muted-foreground" />
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="grid-cols-[1fr_auto] items-center gap-3">
            <div>
              <CardDescription>Tiempo planificado</CardDescription>
              <CardTitle className="mt-1 text-3xl">
                {formatMinutes(overview.plannedFocusMinutes)}
              </CardTitle>
            </div>
            <CalendarClock aria-hidden="true" className="size-6 text-muted-foreground" />
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="grid-cols-[1fr_auto] items-center gap-3">
            <div>
              <CardDescription>Tiempo real de enfoque</CardDescription>
              <CardTitle className="mt-1 text-3xl">
                {formatMinutes(overview.actualFocusMinutes)}
              </CardTitle>
            </div>
            <Clock3 aria-hidden="true" className="size-6 text-muted-foreground" />
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Tiempo planificado y realizado</CardTitle>
          <CardDescription>
            Comparación del tiempo de concentración del plan más reciente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Tiempo planificado</p>
              <p className="text-2xl font-semibold">
                {formatMinutes(overview.plannedFocusMinutes)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Tiempo realizado</p>
              <p className="text-2xl font-semibold">
                {formatMinutes(overview.actualFocusMinutes)}
              </p>
            </div>
          </div>
          <ProgressBar value={timeCompletion} />
          <p className="text-sm text-muted-foreground">
            Has completado el {timeCompletion}% del tiempo de enfoque
            planificado.
          </p>
        </CardContent>
      </Card>

      <section
        aria-label="Gráficos de progreso"
        className="grid gap-4 lg:grid-cols-2"
      >
        <CategoryChart overview={overview} />
        <WeeklyFocusChart overview={overview} />
      </section>

      <section aria-labelledby="activity-progress-title" className="space-y-4">
        <div>
          <h2 id="activity-progress-title" className="text-xl font-semibold">
            Avance por actividad
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            El porcentaje se actualiza al completar bloques del plan Pomodoro.
          </p>
        </div>

        {overview.activities.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Aún no hay actividades para mostrar. Registra una actividad y
              genera un plan de estudio para comenzar el seguimiento.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {overview.activities.map((activity) => (
              <Card key={activity.id}>
                <CardHeader className="grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="min-w-0">
                    <CardTitle>{activity.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {CATEGORY_LABELS[activity.category]} · Prioridad {PRIORITY_LABELS[activity.priority]} · {formatDate(activity.activityDate)}
                    </CardDescription>
                  </div>
                  <ActivityStatusBadge activity={activity} />
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">Progreso registrado</span>
                    <span className="font-medium">{activity.completionPercentage}%</span>
                  </div>
                  <ProgressBar value={activity.completionPercentage} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <EvaluationProgressSection evaluations={overview.evaluations} />

      <WellbeingSupportSection />
    </div>
  );
}

