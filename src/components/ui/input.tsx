import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const baseField =
  "w-full rounded-xl border border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 shadow-sm transition-[border-color,box-shadow] " +
  "focus:outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-500 " +
  "disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref
) {
  return <input ref={ref} className={cn(baseField, "h-10 px-3.5 text-[15px]", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(baseField, "px-3.5 py-2.5 text-[15px] leading-relaxed", className)}
        {...props}
      />
    );
  }
);
