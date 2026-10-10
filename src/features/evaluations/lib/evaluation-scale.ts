import type { EvaluationLevel } from "@/features/evaluations/types/evaluation";

export type EvaluationScaleItem = Readonly<{
  level: EvaluationLevel;
  minimum: number;
  maximum: number;
  label: string;
  description: string;
}>;

export const EVALUATION_SCALE: readonly EvaluationScaleItem[] = [
  {
    level: "needs_reinforcement",
    minimum: 0,
    maximum: 11,
    label: "Necesita refuerzo",
    description: "Conviene repasar los contenidos antes de continuar.",
  },
  {
    level: "satisfactory",
    minimum: 12,
    maximum: 15,
    label: "Satisfactorio",
    description: "Demuestra una comprensión adecuada del contenido.",
  },
  {
    level: "outstanding",
    minimum: 16,
    maximum: 20,
    label: "Destacado",
    description: "Demuestra un dominio sólido del contenido evaluado.",
  },
] as const;

export function getEvaluationLevel(score: number): EvaluationLevel {
  if (score <= 11) {
    return "needs_reinforcement";
  }

  if (score <= 15) {
    return "satisfactory";
  }

  return "outstanding";
}

