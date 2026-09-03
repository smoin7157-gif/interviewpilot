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
            Interview<span className="text-indigo-600">Pilot</span>
          </span>
        </Link>
      </header>
      <main className="relative flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:pt-12">
        {children}
      </main>
    </div>
  );
}
