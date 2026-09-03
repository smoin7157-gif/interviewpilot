import Link from "next/link";
import { LogoMark } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center px-6">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <LogoMark />
          <span className="text-[15px] font-semibold tracking-tight text-zinc-950">
            Interview<span className="text-indigo-600">Pilot</span>
          </span>
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-4 sm:pt-10">{children}</main>
    </div>
  );
}
