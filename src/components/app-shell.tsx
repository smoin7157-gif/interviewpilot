"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp, ClipboardList, LayoutDashboard, LogOut, Menu, Plus, Settings, X } from "lucide-react";
import { logoutAction } from "@/lib/auth-actions";
import { cn, initials } from "@/lib/utils";
import { LogoMark } from "@/components/logo";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/interviews", label: "My Interviews", icon: ClipboardList },
  { href: "/faq", label: "FAQ", icon: CircleHelp },
];

function SidebarContent({
  user,
  onNavigate,
}: {
  user: { name: string; email: string };
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center border-b border-zinc-200/80 px-5">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="inline-flex items-center gap-2.5"
          aria-label="InterviewPilot dashboard"
        >
          <LogoMark />
          <span className="text-[15px] font-bold tracking-[-0.02em] text-zinc-950">
            Interview<span className="text-indigo-600">Pilot</span>
          </span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <Link
          href="/interviews/new"
          onClick={onNavigate}
          className="mb-5 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-indigo-600 text-sm font-semibold text-white shadow-[0_1px_2px_rgba(16,21,40,.06),0_8px_20px_-10px_rgba(61,78,224,.5)] transition-colors hover:bg-indigo-700"
        >
          <Plus className="size-4" aria-hidden />
          Create Interview
        </Link>

        <nav aria-label="Main" className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
                )}
              >
                <item.icon
                  className={cn("size-4.5", active ? "text-indigo-600" : "text-zinc-400")}
                  aria-hidden
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 border-t border-zinc-200/80 pt-4">
          <Link
            href="/settings"
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-full px-3 py-2 text-sm font-medium transition-colors",
              pathname === "/settings"
                ? "bg-indigo-50 text-indigo-700"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
            )}
          >
            <Settings
              className={cn("size-4.5", pathname === "/settings" ? "text-indigo-600" : "text-zinc-400")}
              aria-hidden
            />
            Settings
          </Link>
        </div>
      </div>

      <div className="shrink-0 border-t border-zinc-200/80 p-3">
        <div className="flex items-center gap-3 rounded-full px-2 py-1.5">
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-indigo-400 text-xs font-semibold text-white"
          >
            {initials(user.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-900">{user.name}</p>
            <p className="truncate text-xs text-zinc-400">{user.email}</p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              title="Sign out"
              aria-label="Sign out"
              className="rounded-md p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <LogOut className="size-4" aria-hidden />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function AppShell({
  user,
  children,
}: {
  user: { name: string; email: string };
  children: ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex h-dvh overflow-hidden bg-zinc-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-zinc-200/80 bg-white md:block">
        <SidebarContent user={user} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-zinc-950/40"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close navigation"
              className="absolute right-2 top-4 rounded-md p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
            >
              <X className="size-5" aria-hidden />
            </button>
            <SidebarContent user={user} onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* Mobile top bar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 md:hidden">
        <Link href="/dashboard" className="inline-flex items-center gap-2">
          <LogoMark />
          <span className="text-[15px] font-semibold tracking-tight text-zinc-950">
            Interview<span className="text-indigo-600">Pilot</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation"
          className="rounded-md p-2 text-zinc-600 hover:bg-zinc-100"
        >
          <Menu className="size-5" aria-hidden />
        </button>
      </div>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="min-w-0 flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
