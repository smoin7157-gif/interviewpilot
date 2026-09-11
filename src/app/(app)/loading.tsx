import { LoaderCircle } from "lucide-react";

/** Route-level loading skeleton shown while app pages stream in. */
export default function AppLoading() {
  return (
    <div className="flex h-full items-center justify-center" role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <LoaderCircle className="size-6 animate-spin text-indigo-500" aria-hidden />
    </div>
  );
}
