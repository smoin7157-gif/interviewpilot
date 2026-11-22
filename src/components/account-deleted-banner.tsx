"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

/** Shown once after Settings → delete account redirects to `/?deleted=1`. */
export function AccountDeletedBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const deleted = searchParams.get("deleted") === "1";

  useEffect(() => {
    if (!deleted) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("deleted");
    router.replace(url.pathname + url.search);
  }, [deleted, router]);

  if (!deleted) return null;

  return (
    <div
      role="status"
      className="border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-900"
    >
      Your account and practice data were permanently deleted.
    </div>
  );
}