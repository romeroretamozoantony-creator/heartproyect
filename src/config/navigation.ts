import {
  CalendarDays,
  ClipboardList,
  Clock3,
  TrendingUp,
} from "lucide-react";

import type { NavigationItem } from "@/types/navigation";

export const PRIVATE_NAVIGATION: NavigationItem[] = [
  {
    label: "Actividades",
    href: "/activities",
    icon: ClipboardList,
  },
  {
    label: "Cronograma",
    href: "/schedule",
    icon: CalendarDays,
  },
  {
    label: "Plan de estudio",
    href: "/plan",
    icon: Clock3,
  },
  {
    label: "Progreso",
    href: "/progress",
    icon: TrendingUp,
  },
];
