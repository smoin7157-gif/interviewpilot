import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
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
      <LoginForm />
      <p className="mt-6 text-center text-sm text-zinc-500">
        New to InterviewOS?{" "}
        <Link href="/signup" className="font-semibold text-indigo-600 hover:text-indigo-500">
          Create an account
        </Link>
      </p>
    </div>
  );
}
