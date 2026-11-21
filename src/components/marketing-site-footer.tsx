"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

/** Avoid hydrating footer links until mount — devtools/overlays can inject attrs into SSR HTML. */
const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function MarketingSiteFooter({ variant }: { variant: "auth" | "legal" }) {
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  const footerClass =
    variant === "auth"
      ? "relative border-t border-zinc-200/70 bg-white/60"
      : "border-t border-zinc-200 bg-white";

  const innerClass =
    variant === "auth"
      ? "mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-6 py-5 text-xs text-zinc-500 sm:flex-row"
      : "mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs text-zinc-500 sm:flex-row";

  if (!mounted) {
    return (
      <footer className={footerClass}>
        <div className={innerClass}>
          <p>&copy; InterviewOS</p>
          <nav aria-hidden className="flex items-center gap-5">
            <span className="invisible">Legal</span>
          </nav>
        </div>
      </footer>
    );
  }

  const year = new Date().getFullYear();

  return (
    <footer className={footerClass}>
      <div className={innerClass}>
        <p>
          &copy; {year} InterviewOS
        </p>
        {variant === "auth" ? (
          <nav aria-label="Legal" className="flex items-center gap-5">
            <Link href="/privacy" className="font-medium text-zinc-600 transition-colors hover:text-zinc-950">
              Privacy
            </Link>
            <Link href="/terms" className="font-medium text-zinc-600 transition-colors hover:text-zinc-950">
              Terms
            </Link>
            <Link href="/faq" className="font-medium text-zinc-600 transition-colors hover:text-zinc-950">
              FAQ
            </Link>
          </nav>
        ) : (
          <nav aria-label="Footer" className="flex items-center gap-5">
            <Link href="/" className="font-medium text-zinc-600 transition-colors hover:text-zinc-950">
              Home
            </Link>
            <Link href="/privacy" className="font-medium text-zinc-600 transition-colors hover:text-zinc-950">
              Privacy
            </Link>
            <Link href="/terms" className="font-medium text-zinc-600 transition-colors hover:text-zinc-950">
              Terms
            </Link>
          </nav>
        )}
      </div>
    </footer>
  );
}