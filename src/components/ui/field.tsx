import { cloneElement, isValidElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** ARIA props `Field` forwards to the single control it wraps. */
type FieldControlProps = {
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
};

/**
 * Label + hint + error wrapper for a single form control.
 *
 * The hint and error are wired to the control with `aria-describedby` (and
 * `aria-invalid` while an error is showing), so a screen-reader user hears why
 * a field was rejected instead of just an alert somewhere nearby. The ids are
 * derived from `htmlFor`, which every caller already supplies and which is
 * unique per form.
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const hintId = hint && htmlFor ? `${htmlFor}-hint` : undefined;
  const errorId = error && htmlFor ? `${htmlFor}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  let control = children;
  if (isValidElement<FieldControlProps>(children)) {
    // Preserve any description the control already had (a few inputs carry
    // their own), and never clear an existing aria-invalid when this Field
    // has no error of its own.
    const existing = children.props["aria-describedby"];
    control = cloneElement(children, {
      "aria-describedby": [existing, describedBy].filter(Boolean).join(" ") || undefined,
      "aria-invalid": error ? true : children.props["aria-invalid"],
    });
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-sm font-medium text-zinc-800">
          {label}
          {required && (
            <span className="ml-0.5 text-zinc-400" aria-hidden>
              *
            </span>
          )}
        </label>
        {hint && (
          <span id={hintId} className="text-xs text-zinc-400">
            {hint}
          </span>
        )}
      </div>
      {control}
      {error && (
        <p id={errorId} role="alert" className="text-[13px] leading-snug text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
