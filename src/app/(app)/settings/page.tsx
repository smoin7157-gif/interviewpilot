import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { PasswordForm, ProfileForm } from "@/components/settings-forms";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-[28px]">Settings</h1>
      <p className="mt-1.5 text-[15px] text-zinc-500">Manage your account details.</p>

      <div className="mt-8 space-y-6">
        <Card className="p-6">
          <h2 className="text-base font-semibold text-zinc-900">Profile</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Your name appears on your dashboard greeting.
          </p>
          <div className="mt-5">
            <ProfileForm currentName={user.name} />
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-base font-semibold text-zinc-900">Account</h2>
          <p className="mt-1 text-sm text-zinc-500">
            You&rsquo;re signed in as <span className="font-medium text-zinc-700">{user.email}</span>.
          </p>
          <div className="mt-5 space-y-1">
            <p className="text-sm font-medium text-zinc-800">Email</p>
            <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-[15px] text-zinc-500">
              {user.email}
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-base font-semibold text-zinc-900">Password</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Use at least 8 characters with a mix of letters and numbers.
          </p>
          <div className="mt-5">
            <PasswordForm />
          </div>
        </Card>
      </div>
    </div>
  );
}
