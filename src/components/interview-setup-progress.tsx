import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Where the user is in the create-interview journey — shown on every step so
 * the sequence never feels like a surprise jump.
 */
export type InterviewSetupPhase = "details" | "prepare" | "generate" | "practice";

const STEPS: { key: InterviewSetupPhase; label: string }[] = [
  { key: "details", label: "Details" },
  { key: "prepare", label: "Prepare" },
  { key: "generate", label: "Generate" },
  { key: "practice", label: "Practice" },
];

function phaseIndex(phase: InterviewSetupPhase) {
  return STEPS.findIndex((s) => s.key === phase);
}

export function InterviewSetupProgress({
  phase,
  className,
}: {
  phase: InterviewSetupPhase;
  className?: string;
}) {
  const current = phaseIndex(phase);

  return (
    <nav aria-label="Interview setup progress" className={cn("w-full", className)}>
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 sm:gap-x-2">
        {STEPS.map((step, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={step.key} className="flex items-center gap-1 sm:gap-2">
              {i > 0 && (
                <span
                  aria-hidden
                  className={cn(
                    "hidden h-px w-4 sm:inline sm:w-6",
                    done ? "bg-indigo-300" : "bg-zinc-200"
                  )}
                />
              )}
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
                  done && "bg-indigo-50 text-indigo-700",
                  active && "bg-indigo-600 text-white shadow-sm",
                  !done && !active && "bg-zinc-100 text-zinc-500"
                )}
                aria-current={active ? "step" : undefined}
              >
                {done ? (
                  <Check className="size-3.5" aria-hidden />
                ) : (
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded-full text-[10px]",
                      active ? "bg-white/20 text-white" : "bg-zinc-200 text-zinc-600"
                    )}
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                )}
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}