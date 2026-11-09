import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth-forms";
import { safeRedirectPath } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Log in",
  description:
    "Log in to InterviewOS to pick up your interview practice, mock sessions, and saved debriefs.",
  alternates: { canonical: "/login" },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; stale?: string }>;
}) {
  const { next, stale } = await searchParams;
  const nextPath = safeRedirectPath(next);

  return (
    <div className="w-full max-w-sm">
      <div className="text-center">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
          Welcome back
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-zinc-950">
          Log in to continue
        </h1>
        <p className="mt-2 text-[15px] text-zinc-500">Pick up where your practice left off.</p>
      </div>
      {stale === "1" && (
        <p
          role="status"
          className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm leading-snug text-amber-800"
        >
          Your session expired or is no longer valid. Sign in again to keep practicing.
        </p>
      )}
      <LoginForm nextPath={nextPath} />
      <p className="mt-6 text-center text-sm text-zinc-500">
        New to InterviewOS?{" "}
        <Link href="/signup" className="font-semibold text-indigo-600 hover:text-indigo-500">
          Create an account
        </Link>
      </p>
    </div>
  );
}
