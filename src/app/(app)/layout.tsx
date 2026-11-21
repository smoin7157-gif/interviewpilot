import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { PRIVATE_ROBOTS } from "@/lib/seo";

/**
 * Signed-in pages are user-scoped and must never be indexed. robots.txt blocks
 * crawlers from these paths, but a noindex directive also covers a page that
 * was linked before the robots rule existed (or by another site).
 */
export const metadata: Metadata = {
  robots: PRIVATE_ROBOTS,
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <AppShell user={{ name: user.name, email: user.email }}>{children}</AppShell>;
}
