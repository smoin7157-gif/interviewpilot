import { LoaderCircle } from "lucide-react";

/** Route-level loading state for the focused (dark) mock-interview screen. */
export default function FocusLoading() {
  return (
    <div className="flex h-full items-center justify-center" role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <LoaderCircle className="size-6 animate-spin text-indigo-400" aria-hidden />
    </div>
  );
}
