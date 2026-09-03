"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Ellipsis, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SessionMenu({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/interviews/${sessionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      setOpen(false);
      router.refresh();
    } catch {
      setError("Couldn't delete this interview. Please try again.");
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Interview options"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <Ellipsis className="size-4" aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border border-zinc-200 bg-white p-1.5 shadow-lg"
        >
          {confirming ? (
            <div className="p-1">
              <div className="flex items-start gap-2.5 px-1.5 pb-2 pt-1">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-red-500" aria-hidden />
                <p className="text-sm leading-snug text-zinc-700">
                  Delete this interview and its questions? This can&rsquo;t be undone.
                </p>
              </div>
              {error && <p className="px-1.5 pb-2 text-[13px] text-red-600">{error}</p>}
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setConfirming(false); setError(null); }}>
                  Cancel
                </Button>
                <Button size="sm" variant="danger" loading={busy} onClick={handleDelete}>
                  Delete
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              role="menuitem"
              onClick={() => setConfirming(true)}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <Trash2 className="size-4" aria-hidden />
              Delete interview
            </button>
          )}
        </div>
      )}
    </div>
  );
}
