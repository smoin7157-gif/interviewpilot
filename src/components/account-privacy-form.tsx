"use client";

import { useActionState } from "react";
import Link from "next/link";
import { deleteAccountAction, type AccountActionState } from "@/lib/account-actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const initial: AccountActionState = {};

export function AccountPrivacyPanel({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState(deleteAccountAction, initial);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900">Download your data</h3>
        <p className="mt-1 text-sm text-zinc-500">
          JSON export of your profile, interviews, attempts, and mock sessions. You must stay signed
          in for the download to work. If you cannot log in, use our{" "}
          <Link href="/contact" className="font-medium text-zinc-700 underline-offset-2 hover:underline">
            Contact page
          </Link>
          .
        </p>
        <a
          href="/api/account/export"
          className="mt-3 inline-flex text-sm font-medium text-indigo-600 underline-offset-2 hover:underline"
        >
          Download my data
        </a>
      </div>

      <div className="border-t border-zinc-200 pt-6">
        <h3 className="text-sm font-semibold text-red-800">Delete account and data</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Permanently removes your account, interviews, attempts, and mock history. This cannot be
          undone. See our{" "}
          <Link href="/privacy" className="font-medium text-zinc-700 underline-offset-2 hover:underline">
            Privacy policy
          </Link>
          .
        </p>

        {state.error && (
          <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </div>
        )}

        <form action={formAction} className="mt-4 space-y-4">
          <Field
            label="Confirm your email"
            htmlFor="confirmEmail"
            required
            error={state.fieldErrors?.confirmEmail?.[0]}
          >
            <Input
              id="confirmEmail"
              name="confirmEmail"
              type="email"
              autoComplete="email"
              placeholder={email}
              required
            />
          </Field>
          <Field
            label="Password"
            htmlFor="deletePassword"
            required
            error={state.fieldErrors?.password?.[0]}
          >
            <Input
              id="deletePassword"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>
          <Button type="submit" variant="outline" loading={pending} className="border-red-200 text-red-700 hover:bg-red-50">
            {pending ? "Deleting…" : "Delete my account"}
          </Button>
        </form>
      </div>
    </div>
  );
}