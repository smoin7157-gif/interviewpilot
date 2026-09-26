"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/dialog";

export function MockDeleteButton({ mockId }: { mockId: string }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Synchronous guard against a double-click firing two DELETEs.
  const busyRef = useRef(false);
  const router = useRouter();

  async function handleDelete() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/mock-interviews/${mockId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      setConfirmOpen(false);
      router.refresh();
    } catch {
      setError("Couldn't delete this session. Please try again.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        aria-label="Delete mock session"
        title="Delete mock session"
        className="rounded-md p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => {
          if (busy) return;
          setConfirmOpen(false);
          setError(null);
        }}
        onConfirm={handleDelete}
        title="Delete this mock session?"
        description="This removes the session, its transcript, and its debrief. This can't be undone."
        confirmLabel="Delete session"
        loading={busy}
        error={error}
      />
    </>
  );
}
