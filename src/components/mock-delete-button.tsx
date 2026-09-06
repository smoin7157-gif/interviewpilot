"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MockDeleteButton({ mockId }: { mockId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/mock-interviews/${mockId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      router.refresh();
    } catch {
      setError("Couldn't delete this session. Please try again.");
      setBusy(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
        <span className="text-[13px] font-medium text-red-700">Delete this session?</span>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
          Cancel
        </Button>
        <Button size="sm" variant="danger" loading={busy} onClick={handleDelete}>
          Delete
        </Button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      aria-label="Delete mock session"
      title="Delete mock session"
      className="rounded-md p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
    >
      <Trash2 className="size-4" aria-hidden />
    </button>
  );
}