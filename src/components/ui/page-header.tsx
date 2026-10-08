import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The header every top-level app page shares: an optional eyebrow, the page
 * title, a one-line description and a row of actions on the right.
 *
 * Having one component means the dashboard, the two lists, the create flow,
 * settings and the help centre all line their titles up the same way — and a
 * page can never quietly drift to a different heading size or rhythm.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  align = "left",
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-col gap-5",
        align === "center"
          ? "items-center text-center"
          : "sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className={cn("min-w-0", align === "center" && "max-w-2xl")}>
        {eyebrow && (
          <p className="font-display text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
            {eyebrow}
          </p>
        )}
        <h1
          className={cn(
            "text-balance text-2xl font-semibold tracking-tight text-zinc-950 sm:text-[28px]",
            eyebrow ? "mt-1.5" : undefined
          )}
        >
          {title}
        </h1>
        {description && (
          <p
            className={cn(
              "mt-1.5 text-[15px] leading-relaxed text-zinc-500",
              align === "center" ? "mx-auto max-w-xl" : "max-w-2xl"
            )}
          >
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div
          className={cn(
            "flex shrink-0 flex-wrap items-center gap-2",
            align === "center" && "justify-center"
          )}
        >
          {actions}
        </div>
      )}
    </header>
  );
}
