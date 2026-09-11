import Link from "next/link";
import { Compass } from "lucide-react";
import { Logo } from "@/components/logo";
import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-[#fbfcfe]">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center px-6">
        <Logo href="/" />
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="flex flex-1 items-center justify-center px-6 pb-24 outline-none"
      >
        <div className="w-full max-w-md text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            <Compass className="size-7" aria-hidden />
          </div>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">404</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
            This page doesn&rsquo;t exist.
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-zinc-500">
            The link may be outdated or mistyped. Your interviews, mock sessions and debriefs are
            safe — pick up where you left off.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/dashboard" className={buttonClasses({ size: "lg" })}>
              Go to dashboard
            </Link>
            <Link href="/" className={buttonClasses({ size: "lg", variant: "outline" })}>
              Back to home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
