import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/components/auth-forms";
import { safeRedirectPath } from "@/lib/utils";

export const metadata: Metadata = { title: "Create your account" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const nextPath = safeRedirectPath(next);

  return (
    <div className="w-full max-w-sm">
      <div className="text-center">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
          Get started free
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-zinc-950">
          Create your account
        </h1>
        <p className="mt-2 text-[15px] text-zinc-500">
          Practice for the roles that matter to you — free to start.
        </p>
      </div>
      <SignupForm nextPath={nextPath} />
      <p className="mt-6 text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
          Log in
        </Link>
      </p>
    </div>
  );
}
