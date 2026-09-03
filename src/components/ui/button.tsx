import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-indigo-600 text-white shadow-[0_1px_2px_rgba(16,21,40,.06),0_8px_20px_-10px_rgba(61,78,224,.45)] hover:bg-indigo-700 active:bg-indigo-800 disabled:hover:bg-indigo-600",
  secondary:
    "bg-zinc-950 text-white hover:bg-zinc-800 active:bg-zinc-900 shadow-sm disabled:hover:bg-zinc-950",
  outline:
    "border border-zinc-300 bg-white text-zinc-900 shadow-sm hover:border-zinc-400 hover:bg-zinc-50 active:bg-zinc-100 disabled:hover:bg-white",
  ghost: "text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200 disabled:hover:bg-transparent",
  danger:
    "bg-[#c74263] text-white shadow-[0_1px_2px_rgba(16,21,40,.06),0_8px_20px_-10px_rgba(199,66,99,.5)] hover:bg-[#b53755] active:bg-[#a12e49] disabled:hover:bg-[#c74263]",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-4 text-[13px] gap-1.5 rounded-full",
  md: "h-10 px-5 text-sm gap-2 rounded-full",
  lg: "h-11 px-7 text-[15px] gap-2 rounded-full",
  icon: "h-9 w-9 rounded-full",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
} = {}) {
  return cn(
    "inline-flex select-none items-center justify-center font-semibold tracking-[-0.01em] transition-[transform,background-color,border-color,box-shadow] duration-200",
    "hover:-translate-y-px active:translate-y-0",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0",
    variantClasses[variant],
    sizeClasses[size],
    className
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading = false, disabled, children, type, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      disabled={disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center font-semibold tracking-[-0.01em] transition-[transform,background-color,border-color,box-shadow] duration-200",
        "hover:-translate-y-px active:translate-y-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
