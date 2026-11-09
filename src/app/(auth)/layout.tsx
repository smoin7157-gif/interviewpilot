import Link from "next/link";
import { LogoMark } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#fbfcfe]">
      {/* Ambient glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 left-1/2 h-[420px] w-[760px] -translate-x-1/2 rounded-full opacity-70 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(61,78,224,.12), rgba(110,92,245,.08), transparent)",
        }}
      />
      <header className="relative mx-auto flex h-16 w-full max-w-5xl items-center px-6">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <LogoMark />
          <span className="text-[16px] font-bold tracking-[-0.02em] text-zinc-950">
            Interview<span className="text-indigo-600">OS</span>
          </span>
        </Link>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="relative flex flex-1 items-start justify-center px-4 pb-16 pt-6 outline-none sm:pt-12"
      >
        {children}
      </main>
      <footer className="relative border-t border-zinc-200/70 bg-white/60">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-6 py-5 text-xs text-zinc-500 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} InterviewOS</p>
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
        </div>
      </footer>
    </div>
  );
}
