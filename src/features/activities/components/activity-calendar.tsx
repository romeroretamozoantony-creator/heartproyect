"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { ActivityFormValues } from "@/features/activities/schemas/activity-schema";
import type { Activity } from "@/features/activities/types/activity";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const CATEGORY_LABELS: Record<ActivityFormValues["category"], string> = {
  academic: "Académica",
  work: "Laboral",
  personal: "Personal",
};

const CATEGORY_MARKERS: Record<ActivityFormValues["category"], string> = {
  academic: "bg-blue-500",
  work: "bg-amber-500",
  personal: "bg-emerald-500",
};

type CalendarEntry = Readonly<{
  id: string;
  title: string;
  category: ActivityFormValues["category"];
  activityDate: string;
  startTime: string;
  endTime: string;
  isDraft: boolean;
}>;

type ActivityCalendarProps = Readonly<{
  activities: readonly Activity[];
  focusDate?: string;
  preview: ActivityFormValues | null;
}>;

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function todayKey() {
  const today = new Date();
  return toDateKey(today.getFullYear(), today.getMonth(), today.getDate());
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function monthWeeks(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstWeekday = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks: Array<Array<number | null>> = [];

  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }

  return weeks;
}

function isSavedPreview(
  preview: ActivityFormValues,
  activities: readonly Activity[],
) {
  return activities.some(
    (activity) =>
      activity.title === preview.title &&
      activity.category === preview.category &&
      activity.activityDate === preview.activityDate &&
      activity.startTime === preview.startTime &&
      activity.endTime === preview.endTime &&
      activity.priority === preview.priority,
  );
}

export function ActivityCalendar({
  activities,
  focusDate,
  preview,
}: ActivityCalendarProps) {
  const initialDate =
    focusDate ?? preview?.activityDate ?? activities[0]?.activityDate ?? todayKey();
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    parseLocalDate(initialDate),
  );

  // Solo los registros con fecha y horario aparecen en el calendario.
  const entries: CalendarEntry[] = activities
    .filter((activity) => activity.activityDate && activity.startTime && activity.endTime)
    .map((activity) => ({
      id: activity.id,
      title: activity.title,
      category: activity.category,
      activityDate: activity.activityDate ?? "",
      startTime: activity.startTime ?? "",
      endTime: activity.endTime ?? "",
      isDraft: false,
    }));

  if (preview && !isSavedPreview(preview, activities)) {
    entries.push({
      id: "preview",
      title: preview.title,
      category: preview.category,
      activityDate: preview.activityDate,
      startTime: preview.startTime,
      endTime: preview.endTime,
      isDraft: true,
    });
  }

  const selectedEntries = entries
    .filter((entry) => entry.activityDate === selectedDate)
    .sort((first, second) => first.startTime.localeCompare(second.startTime));
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const currentDay = todayKey();

  function changeMonth(offset: number) {
    const nextMonth = new Date(year, month + offset, 1);
    setVisibleMonth(nextMonth);
    setSelectedDate(
      toDateKey(nextMonth.getFullYear(), nextMonth.getMonth(), 1),
    );
  }

  function showToday() {
    const today = new Date();
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(todayKey());
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold capitalize">
          {new Intl.DateTimeFormat("es-PE", {
            month: "long",
            year: "numeric",
          }).format(visibleMonth)}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            aria-label="Ver mes anterior"
            size="icon-sm"
            type="button"
            variant="outline"
            onClick={() => changeMonth(-1)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button size="sm" type="button" variant="outline" onClick={showToday}>
            Hoy
          </Button>
          <Button
            aria-label="Ver mes siguiente"
            size="icon-sm"
            type="button"
            variant="outline"
            onClick={() => changeMonth(1)}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-112 table-fixed border-collapse">
          <thead>
            <tr>
              {WEEKDAYS.map((weekday) => (
                <th
                  className="pb-2 text-center text-xs font-medium text-muted-foreground"
                  key={weekday}
                  scope="col"
                >
                  {weekday}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthWeeks(visibleMonth).map((week, weekIndex) => (
              <tr key={`${year}-${month}-${weekIndex}`}>
                {week.map((day, dayIndex) => {
                  if (!day) {
                    return (
                      <td
                        className="h-16 border p-1"
                        key={`empty-${weekIndex}-${dayIndex}`}
                      />
                    );
                  }

                  const date = toDateKey(year, month, day);
                  const dayEntries = entries.filter(
                    (entry) => entry.activityDate === date,
                  );
                  const isSelected = selectedDate === date;

                  return (
                    <td className="h-16 border p-1 align-top" key={date}>
                      <button
                        aria-current={date === currentDay ? "date" : undefined}
                        aria-label={`${day} de ${new Intl.DateTimeFormat("es-PE", {
                          month: "long",
                        }).format(visibleMonth)}${dayEntries.length ? `, ${dayEntries.length} actividades` : ""}`}
                        aria-pressed={isSelected}
                        className={`flex size-full min-h-14 flex-col rounded-md p-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          isSelected ? "bg-primary text-primary-foreground" : ""
                        }`}
                        type="button"
                        onClick={() => setSelectedDate(date)}
                      >
                        <span
                          className={
                            date === currentDay ? "font-bold underline" : ""
                          }
                        >
                          {day}
                        </span>
                        {dayEntries.length > 0 ? (
                          <span className="mt-auto flex max-w-full gap-1 overflow-hidden">
                            {dayEntries.slice(0, 3).map((entry) => (
                              <span
                                className={`size-1.5 shrink-0 rounded-full ${
                                  isSelected
                                    ? "bg-primary-foreground"
                                    : CATEGORY_MARKERS[entry.category]
                                }`}
                                key={entry.id}
                              />
                            ))}
                          </span>
                        ) : null}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="rounded-xl border bg-muted/30 p-4">
        <h3 className="font-medium">
          {new Intl.DateTimeFormat("es-PE", { dateStyle: "long" }).format(
            parseLocalDate(selectedDate),
          )}
        </h3>
        {selectedEntries.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {selectedEntries.map((entry) => (
              <li
                className="flex items-start gap-3 rounded-lg border bg-background p-3"
                key={entry.id}
              >
                <span
                  aria-hidden="true"
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${CATEGORY_MARKERS[entry.category]}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{entry.title}</p>
                    {entry.isDraft ? (
                      <span className="rounded-full border border-dashed px-2 py-0.5 text-xs text-muted-foreground">
                        Vista previa
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {entry.startTime} a {entry.endTime} · {CATEGORY_LABELS[entry.category]}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            No hay actividades para este día.
          </p>
        )}
      </section>

      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {(Object.keys(CATEGORY_LABELS) as ActivityFormValues["category"][]).map(
          (category) => (
            <span className="flex items-center gap-1.5" key={category}>
              <span
                aria-hidden="true"
                className={`size-2 rounded-full ${CATEGORY_MARKERS[category]}`}
              />
              {CATEGORY_LABELS[category]}
            </span>
          ),
        )}
      </div>
    </div>
  );
}
