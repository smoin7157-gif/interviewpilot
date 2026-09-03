"use client";

import { useActionState } from "react";
import { changePasswordAction, updateProfileAction, type AuthActionState } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

function Banner({ kind, children }: { kind: "error" | "success"; children: React.ReactNode }) {
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={
        kind === "error"
          ? "rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm leading-snug text-red-700"
          : "rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm leading-snug text-emerald-700"
      }
    >
      {children}
    </div>
  );
}

const initialState: AuthActionState = {};

export function ProfileForm({ currentName }: { currentName: string }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initialState);
  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Banner kind="error">{state.error}</Banner>}
      {state.success && <Banner kind="success">{state.success}</Banner>}
      <Field label="Name" htmlFor="profile-name" required error={state.fieldErrors?.name?.[0]}>
        <Input id="profile-name" name="name" defaultValue={currentName} required className="max-w-sm" />
      </Field>
      <Button type="submit" loading={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState);
  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Banner kind="error">{state.error}</Banner>}
      {state.success && <Banner kind="success">{state.success}</Banner>}
      <Field label="Current password" htmlFor="current-password" required>
        <Input
          id="current-password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          className="max-w-sm"
        />
      </Field>
      <Field
        label="New password"
        htmlFor="new-password"
        required
        hint="At least 8 characters"
        error={state.fieldErrors?.newPassword?.[0]}
      >
        <Input
          id="new-password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="max-w-sm"
        />
      </Field>
      <Button type="submit" loading={pending}>
        {pending ? "Updating…" : "Change password"}
      </Button>
    </form>
  );
}
