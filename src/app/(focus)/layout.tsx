import { requireUser } from "@/lib/auth";

/**
 * Focused (distraction-free) routes: protected like the app, but rendered
 * without the sidebar shell — used by the AI mock interview screen.
 */
export default async function FocusLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <div className="h-dvh bg-zinc-950 text-white">{children}</div>;
}
