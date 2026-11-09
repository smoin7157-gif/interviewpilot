import type { ReactNode } from "react";

/**
 * Shared shell for the public legal documents. Keeping the prose rhythm in one
 * place means the privacy policy and terms can't drift to different heading
 * sizes, and both inherit the same readable measure from the page layout.
 */
export function LegalDocument({ updated, children }: { updated: string; children: ReactNode }) {
  return (
    <article className="mt-8 text-[15px] leading-relaxed text-zinc-600">
      <p className="text-sm text-zinc-400">Last updated: {updated}</p>
      <div className="mt-8 space-y-8">{children}</div>
    </article>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight text-zinc-950">{title}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}
