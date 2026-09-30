"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { TriangleAlert, X } from "lucide-react";
import { cn, FOCUSABLE_SELECTOR } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Tone = "light" | "dark";

/**
 * Modal dialog primitive.
 *
 * Rendered in a portal so a transformed/animated ancestor (e.g. a hover-lifted
 * Card) can never become the containing block for the overlay. Closes on
 * Escape and — unless `dismissible` is false while an action is in flight —
 * on backdrop click, locks background scroll, traps focus, and restores focus
 * to the trigger on close. `tone` matches the two surfaces it is used on: the
 * light app shell and the dark focus-mode mock screen.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  icon,
  tone = "light",
  dismissible = true,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  dismissible?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const first = panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (first ?? panel).focus();
    }, 0);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus();
    };
  }, [open]);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        if (dismissible) onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [dismissible, onClose]
  );

  // Dialogs only open from a user interaction, so this is always a client
  // render by the time it's true — `document` is available for the portal.
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        onClick={dismissible ? onClose : undefined}
        className={cn(
          "absolute inset-0 h-full w-full",
          tone === "dark" ? "bg-zinc-950/70 backdrop-blur-[1px]" : "bg-zinc-950/40 backdrop-blur-[1px]"
        )}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative w-full max-w-md rounded-2xl border p-6 shadow-[0_1px_2px_rgba(16,21,40,.06),0_24px_60px_-24px_rgba(16,21,40,.4)] outline-none",
          tone === "dark"
            ? "border-zinc-800 bg-zinc-900 text-zinc-100"
            : "border-zinc-200 bg-white text-zinc-900",
          className
        )}
      >
        {dismissible && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={cn(
              "absolute right-3.5 top-3.5 rounded-md p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
              tone === "dark"
                ? "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            )}
          >
            <X className="size-4" aria-hidden />
          </button>
        )}

        <div className="flex items-start gap-3">
          {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
          <div className="min-w-0">
            {title && (
              <h2
                id={titleId}
                className={cn(
                  "text-base font-semibold tracking-tight",
                  tone === "dark" ? "text-white" : "text-zinc-950"
                )}
              >
                {title}
              </h2>
            )}
            {description && (
              <p
                id={descriptionId}
                className={cn(
                  "mt-1.5 text-sm leading-relaxed",
                  tone === "dark" ? "text-zinc-400" : "text-zinc-500"
                )}
              >
                {description}
              </p>
            )}
          </div>
        </div>

        {children}
      </div>
    </div>,
    document.body
  );
}

/**
 * Destructive-action confirmation built on `Dialog`. The confirm button owns
 * the loading state so a double-click can't fire the action twice; while it is
 * busy the dialog is non-dismissible.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  tone = "light",
  loading = false,
  error = null,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
  loading?: boolean;
  error?: string | null;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      tone={tone}
      dismissible={!loading}
      title={title}
      description={description}
      icon={<TriangleAlert className={cn("size-5", tone === "dark" ? "text-red-400" : "text-red-500")} aria-hidden />}
    >
      {error && (
        <p role="alert" className={cn("mt-4 text-[13px] leading-snug", tone === "dark" ? "text-red-300" : "text-red-600")}>
          {error}
        </p>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button size="sm" variant="danger" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
