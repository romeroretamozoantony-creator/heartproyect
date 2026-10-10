"use client";

import { LoaderCircle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { generateStudyPlan } from "@/features/planner/actions/plan-actions";

type GeneratePlanButtonProps = Readonly<{
  disabled: boolean;
}>;

export function GeneratePlanButton({ disabled }: GeneratePlanButtonProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generatePlan() {
    setError(null);
    setIsGenerating(true);
    const result = await generateStudyPlan();

    if (result.status === "success") {
      router.push("/plan");
      return;
    }

    setError(result.message);
    setIsGenerating(false);
  }

  return (
    <div className="space-y-3">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button
        className="w-full"
        disabled={disabled || isGenerating}
        size="lg"
        type="button"
        onClick={generatePlan}
      >
        {isGenerating ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" />
        ) : (
          <Sparkles aria-hidden="true" />
        )}
        {isGenerating ? "Diseñando plan..." : "Diseñar plan"}
      </Button>
    </div>
  );
}
