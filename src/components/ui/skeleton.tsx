import { cn } from "@/lib/utils";

/**
 * A single placeholder block for route-level loading states.
 *
 * Kept deliberately plain (a pulsing zinc block) so skeletons read as "content
 * is coming" rather than as real-but-broken UI. `aria-hidden` because the
 * surrounding loading region carries the screen-reader status.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-zinc-100", className)} />;
}
