import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(16,21,40,.05),0_8px_24px_-16px_rgba(16,21,40,.14)]",
        className
      )}
      {...props}
    />
  );
}
