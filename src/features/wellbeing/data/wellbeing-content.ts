import {
  Droplets,
  GraduationCap,
  HeartHandshake,
  MoonStar,
  PersonStanding,
  TimerReset,
} from "lucide-react";

export type WellbeingHabit = Readonly<{
  title: string;
  description: string;
  icon: typeof MoonStar;
}>;

export type SupportResource = Readonly<{
  title: string;
  description: string;
  detail: string;
  href: string | null;
  linkLabel: string;
  icon: typeof GraduationCap;
}>;

export const WELLBEING_HABITS: readonly WellbeingHabit[] = [
  {
    title: "Respeta los descansos",
    description:
      "Al terminar un bloque, aléjate unos minutos de la pantalla antes de continuar.",
    icon: TimerReset,
  },
  {
    title: "Cuida tu descanso",
    description:
      "Evita convertir el tiempo de sueño en tiempo de estudio y mantén una rutina regular.",
    icon: MoonStar,
  },
  {
    title: "Mantente hidratado",
    description:
      "Ten agua disponible durante tus sesiones y aprovecha las pausas para hidratarte.",
    icon: Droplets,
  },
  {
    title: "Incluye movimiento",
    description:
      "Cambia de postura, estírate o camina brevemente entre periodos prolongados de actividad.",
    icon: PersonStanding,
  },
] as const;

function getInstitutionalResource(): SupportResource {
  const institutionName =
    process.env.NEXT_PUBLIC_INSTITUTION_NAME?.trim() || "tu institución";
  const configuredUrl =
    process.env.NEXT_PUBLIC_INSTITUTIONAL_SUPPORT_URL?.trim();
  let href: string | null = null;

  if (configuredUrl) {
    try {
      const parsedUrl = new URL(configuredUrl);

      if (parsedUrl.protocol === "https:") {
        href = parsedUrl.toString();
      }
    } catch {
      href = null;
    }
  }

  return {
    title: "Bienestar universitario",
    description: `Consulta los servicios de bienestar, tutoría o psicología de ${institutionName}.`,
    detail: href
      ? "Accede al canal institucional configurado."
      : "Busca el área de Bienestar Universitario en el portal o campus de tu institución.",
    href,
    linkLabel: "Abrir recurso institucional",
    icon: GraduationCap,
  };
}

export function getSupportResources(): readonly SupportResource[] {
  return [
    getInstitutionalResource(),
    {
      title: "Línea 113 Salud",
      description:
        "Orientación y apoyo psicológico gratuito del Ministerio de Salud del Perú.",
      detail: "Llama al 113 y selecciona la opción 5. Disponible las 24 horas.",
      href: "https://www.gob.pe/institucion/minsa/pages/555-linea-113-salud-recibir-orientacion-e-informacion-en-salud",
      linkLabel: "Ver canales oficiales",
      icon: HeartHandshake,
    },
    {
      title: "Centros de Salud Mental Comunitaria",
      description:
        "Directorio oficial para ubicar atención especializada cerca de tu localidad.",
      detail:
        "Consulta direcciones y teléfonos publicados por el Ministerio de Salud.",
      href: "https://www.gob.pe/10942-buscar-centros-de-salud-mental-comunitaria",
      linkLabel: "Buscar un centro",
      icon: GraduationCap,
    },
  ];
}

