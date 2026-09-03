import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="text-center">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-950">Welcome back</h1>
        <p className="mt-1.5 text-sm text-zinc-500">Log in to continue your interview practice.</p>
      </div>
      <LoginForm />
      <p className="mt-6 text-center text-sm text-zinc-500">
        New to InterviewPilot?{" "}
        <Link href="/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
          Create an account
        </Link>
      </p>
    </div>
  );
}
