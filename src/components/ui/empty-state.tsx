import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * The one way this app says "there is nothing here yet".
 *
 * Every list and panel used to hand-roll its own centred icon + copy + button,
 * which drifted in size and spacing between screens. This keeps the shape
 * consistent and gives each empty state a real next action instead of a dead
 * end.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  size = "lg",
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  /** Primary next step — a `Link` or `Button`. */
  action?: ReactNode;
  /** Optional lighter action shown beside the primary one. */
  secondaryAction?: ReactNode;
  size?: "sm" | "lg";
  className?: string;
}) {
  const large = size === "lg";
  return (
    <Card
      className={cn(
        "flex flex-col items-center text-center",
        large ? "px-6 py-16 sm:py-20" : "px-5 py-10",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-indigo-50 text-indigo-600",
          large ? "size-14" : "size-11"
        )}
      >
        <Icon className={large ? "size-7" : "size-5"} aria-hidden />
      </div>
      <h2 className={cn("font-semibold text-zinc-950", large ? "mt-5 text-lg" : "mt-3 text-base")}>
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            "mt-2 max-w-md leading-relaxed text-zinc-500",
            large ? "text-[15px]" : "text-sm"
          )}
        >
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          {action}
          {secondaryAction}
        </div>
      )}
    </Card>
  );
}
