import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "indigo" | "green" | "amber" | "red" | "zinc";

const tones: Record<Tone, string> = {
  neutral: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  zinc: "bg-zinc-50 text-zinc-500 ring-zinc-200",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}

export const categoryTone = (category: string): Tone => {
  switch (category) {
    case "Technical":
      return "indigo";
    case "Behavioral":
      return "green";
    case "Project":
      return "amber";
    case "Role-specific":
      return "neutral";
    default:
      return "zinc";
  }
};
