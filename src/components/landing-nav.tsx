"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "#sample", label: "See a sample" },
  { href: "#features", label: "Why InterviewOS" },
  { href: "#how-it-works", label: "How it works" },
] as const;

const MENU_ID = "landing-mobile-menu";

/**
 * Landing header navigation.
 *
 * Desktop shows the section anchors inline. Below `sm` the anchors used to be
 * hidden outright, leaving phone visitors with only the sign-up button and no
 * way to reach the sample or the explainer. They now live in a disclosure
 * menu that closes on Escape, on an outside tap, and after a link is chosen.
 */
export function LandingNav({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    }
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <nav aria-label="Primary" className="relative flex items-center gap-1.5">
      {SECTIONS.map((section) => (
        <Link
          key={section.href}
          href={section.href}
          className="hidden rounded-full px-3.5 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 sm:block"
        >
          {section.label}
        </Link>
      ))}

      {signedIn ? (
        <Link href="/dashboard" className={buttonClasses({ variant: "outline", className: "ml-2" })}>
          Dashboard <ArrowRight className="size-4" aria-hidden />
        </Link>
      ) : (
        <>
          <Link
            href="/login"
            className={buttonClasses({ variant: "ghost", className: "hidden sm:inline-flex" })}
          >
            Log in
          </Link>
          <Link href="/signup" className={buttonClasses({ className: "ml-1" })}>
            Start practicing
          </Link>
        </>
      )}

      <div ref={containerRef} className="sm:hidden">
        <button
          ref={toggleRef}
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={MENU_ID}
          aria-label={open ? "Close menu" : "Open menu"}
          className={cn(
            "rounded-full p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
            open
              ? "bg-zinc-100 text-zinc-900"
              : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
          )}
        >
          {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </button>

        {open && (
          <div
            id={MENU_ID}
            className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-[0_1px_2px_rgba(16,21,40,.06),0_24px_60px_-24px_rgba(16,21,40,.45)]"
          >
            <ul className="space-y-0.5">
              {SECTIONS.map((section) => (
                <li key={section.href}>
                  <Link
                    href={section.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    {section.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-1 border-t border-zinc-100 pt-1">
              <Link
                href={signedIn ? "/dashboard" : "/login"}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {signedIn ? "Dashboard" : "Log in"}
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
