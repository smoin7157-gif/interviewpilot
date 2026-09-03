import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Create your account" };

export default function SignupPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="text-center">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-950">Create your account</h1>
        <p className="mt-1.5 text-sm text-zinc-500">
          Practice for the roles that matter to you — free to start.
        </p>
      </div>
      <SignupForm />
      <p className="mt-6 text-center text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
          Log in
        </Link>
      </p>
    </div>
  );
}
