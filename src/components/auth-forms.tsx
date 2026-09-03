"use client";

import { useActionState } from "react";
import {
  loginAction,
  signupAction,
  type AuthActionState,
} from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

function ErrorBanner({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm leading-snug text-red-700"
    >
      {error}
    </div>
  );
}

function SuccessBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm leading-snug text-emerald-700"
    >
      {message}
    </div>
  );
}

const initialState: AuthActionState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="mt-6 space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      {state.error && <ErrorBanner error={state.error} />}
      <Field label="Email" htmlFor="email" required error={state.fieldErrors?.email?.[0]}>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
      </Field>
      <Field label="Password" htmlFor="password" required error={state.fieldErrors?.password?.[0]}>
        <Input id="password" name="password" type="password" autoComplete="current-password" placeholder="Your password" required />
      </Field>
      <Button type="submit" size="lg" loading={pending} className="w-full">
        {pending ? "Logging in…" : "Log in"}
      </Button>
    </form>
  );
}

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, initialState);

  return (
    <form action={formAction} className="mt-6 space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      {state.error && <ErrorBanner error={state.error} />}
      <Field label="Name" htmlFor="name" required error={state.fieldErrors?.name?.[0]}>
        <Input id="name" name="name" type="text" autoComplete="name" placeholder="Alex Rivera" required />
      </Field>
      <Field label="Email" htmlFor="email" required error={state.fieldErrors?.email?.[0]}>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
      </Field>
      <Field
        label="Password"
        htmlFor="password"
        required
        hint="At least 8 characters"
        error={state.fieldErrors?.password?.[0]}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Create a password"
          minLength={8}
          required
        />
      </Field>
      <Button type="submit" size="lg" loading={pending} className="w-full">
        {pending ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-center text-xs leading-relaxed text-zinc-400">
        By continuing you agree to practice responsibly. No payment, no ads — just interview practice.
      </p>
    </form>
  );
}

export { SuccessBanner };
