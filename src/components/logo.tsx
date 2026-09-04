import Link from "next/link";
import { Compass } from "lucide-react";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-400 text-white",
        "shadow-[0_1px_2px_rgba(16,21,40,.06),0_6px_16px_-6px_rgba(61,78,224,.6)]",
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
      <span className="text-[16px] font-bold tracking-[-0.02em] text-zinc-950">
        Interview<span className="text-indigo-600">OS</span>
      </span>
    </Link>
  );
}
