import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonClasses } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";

/**
 * Legal pages are public: a visitor deciding whether to sign up must be able
 * to read them without an account, so they keep the landing page's light
 * chrome instead of the signed-in app shell.
 */
export default async function LegalLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  return (
    <div className="flex min-h-dvh flex-col bg-[#fbfcfe]">
      <header className="border-b border-zinc-200/70 bg-[#fbfcfe]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-6">
          <Logo href="/" />
          <nav aria-label="Primary" className="flex items-center gap-2">
            <Link
              href="/faq"
              className="hidden rounded-full px-3.5 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 sm:block"
            >
              FAQ
            </Link>
            {user ? (
              <Link href="/dashboard" className={buttonClasses({ variant: "outline" })}>
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className={buttonClasses({ variant: "ghost" })}>
                  Log in
                </Link>
                <Link href="/signup" className={buttonClasses()}>
                  Start practicing
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 outline-none sm:px-8 sm:py-16"
      >
        {children}
      </main>

      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs text-zinc-500 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} InterviewOS</p>
          <nav aria-label="Footer" className="flex items-center gap-5">
            <Link href="/" className="font-medium text-zinc-600 transition-colors hover:text-zinc-950">
              Home
            </Link>
            <Link href="/privacy" className="font-medium text-zinc-600 transition-colors hover:text-zinc-950">
              Privacy
            </Link>
            <Link href="/terms" className="font-medium text-zinc-600 transition-colors hover:text-zinc-950">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
