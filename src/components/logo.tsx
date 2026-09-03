import Link from "next/link";
import { Compass } from "lucide-react";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm",
        className
      )}
    >
      <Compass className="size-4" aria-hidden />
    </span>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-tight text-zinc-950">
        Interview<span className="text-indigo-600">Pilot</span>
      </span>
    </Link>
  );
}
