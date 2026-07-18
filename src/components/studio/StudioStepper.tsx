import type { Stage } from "@/components/ImageOverlay";

const STEPS = [
  { id: "initial" as const, label: "Brand Kit" },
  { id: "style" as const, label: "Wowowify" },
  { id: "adjust" as const, label: "Refine" },
] as const;

interface StudioStepperProps {
  stage: Stage;
}

export function StudioStepper({ stage }: StudioStepperProps) {
  const activeIndex =
    stage === "initial" ? 0 : stage === "style" ? 1 : 2;

  return (
    <nav
      aria-label="Studio progress"
      className="flex items-center justify-center gap-2 sm:gap-4 mb-6"
    >
      {STEPS.map((step, index) => {
        const isComplete = index < activeIndex;
        const isActive = index === activeIndex;
        const isExport = index === 2 && stage === "adjust";

        return (
          <div key={step.id} className="flex items-center gap-2 sm:gap-4">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  isActive || isComplete
                    ? "text-white"
                    : "surface"
                }`}
                style={
                  isActive || isComplete
                    ? { backgroundColor: "var(--color-wowowify)" }
                    : { color: "var(--color-text-secondary)" }
                }
                aria-current={isActive ? "step" : undefined}
              >
                {isComplete ? "✓" : index + 1}
              </div>
              <span
                className="text-xs font-medium"
                style={{
                  color:
                    isActive || isComplete
                      ? "var(--color-text)"
                      : "var(--color-text-secondary)",
                }}
              >
                {isExport && stage === "adjust" ? "Export" : step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className="w-6 sm:w-10 h-0.5 rounded"
                style={{
                  backgroundColor:
                    index < activeIndex
                      ? "var(--color-wowowify)"
                      : "var(--color-border)",
                }}
                aria-hidden
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
