"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Ellipsis, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/dialog";

export function SessionMenu({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  // Synchronous guard: state-based `busy` is not set until the next render, so
  // a fast double-click could otherwise fire two DELETEs.
  const busyRef = useRef(false);
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
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/interviews/${sessionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      setConfirmOpen(false);
      setOpen(false);
      router.refresh();
    } catch {
      setError("Couldn't delete this interview. Please try again.");
    } finally {
      busyRef.current = false;
      setBusy(false);
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
          <button
            type="button"
            role="menuitem"
            onClick={() => setConfirmOpen(true)}
            className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            <Trash2 className="size-4" aria-hidden />
            Delete interview
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => {
          if (busy) return;
          setConfirmOpen(false);
          setError(null);
        }}
        onConfirm={handleDelete}
        title="Delete this interview?"
        description="This deletes the interview and all of its questions. This can't be undone."
        confirmLabel="Delete interview"
        loading={busy}
        error={error}
      />
    </div>
  );
}
