import type { Metadata, Viewport } from "next";
import { requireUser } from "@/lib/auth";
import { PRIVATE_ROBOTS } from "@/lib/seo";

// The focus-mode mock screen is dark; match the mobile browser chrome to it.
export const viewport: Viewport = {
  themeColor: "#101528",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  robots: PRIVATE_ROBOTS,
};

/**
 * Focused (distraction-free) routes: protected like the app, but rendered
 * without the sidebar shell — used by the AI mock interview screen.
 */
export default async function FocusLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div id="main-content" tabIndex={-1} className="h-dvh bg-zinc-950 text-white outline-none">
      {children}
    </div>
  );
}
