"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import {
  clearSessionCookie,
  createSessionToken,
  getSessionUser,
  hashPassword,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { changePasswordSchema, loginSchema, signupSchema, updateProfileSchema } from "@/lib/validation";
import { safeRedirectPath } from "@/lib/utils";
import { getClientKey } from "@/lib/rate-limit";
import { checkAuthRateLimit } from "@/lib/auth-rate-limit";

export type AuthActionState = { error?: string; fieldErrors?: Record<string, string[]>; success?: string };

export async function signupAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const reqHeaders = await headers();
  // Brute-force / abuse guard on the auth entry points — a dedicated limiter
  // (`src/lib/auth-rate-limit.ts`) with its own buckets, separate from the AI
  // endpoints. Keyed per client IP so one busy NAT (e.g. a campus demo) can't
  // exhaust a shared global bucket for everyone else.
  const rl = checkAuthRateLimit("signup", getClientKey(reqHeaders, "auth:signup"));
  if (!rl.ok) {
    return { error: "Too many signup attempts. Please try again later." };
  }

  // `next` arrives as a hidden form field (seeded from the query param).
  const nextPath = safeRedirectPath(formData.get("next"));

  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return { error: "An account with this email already exists. Try logging in instead." };
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email: email.toLowerCase(), passwordHash },
    select: { id: true },
  });

  const token = await createSessionToken(user.id);
  await setSessionCookie(token);
  redirect(nextPath);
}

export async function loginAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const reqHeaders = await headers();
  const rl = checkAuthRateLimit("login", getClientKey(reqHeaders, "auth:login"));
  if (!rl.ok) {
    return { error: "Too many login attempts. Please wait and try again." };
  }

  // `next` arrives as a hidden form field (seeded from the query param).
  const nextPath = safeRedirectPath(formData.get("next"));

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  // One generic message for both cases so errors don't reveal which emails
  // have accounts (account-enumeration resistance).
  const invalid = { error: "Incorrect email or password. Please try again." };
  if (!user) return invalid;

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return invalid;

  const token = await createSessionToken(user.id);
  await setSessionCookie(token);
  redirect(nextPath);
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/");
}

export async function updateProfileAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const parsed = updateProfileSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.user.update({ where: { id: user.id }, data: { name: parsed.data.name } });
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: "Profile updated." };
}

export async function changePasswordAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const fullUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!fullUser) redirect("/login");

  const ok = await verifyPassword(parsed.data.currentPassword, fullUser.passwordHash);
  if (!ok) {
    return { error: "Your current password is incorrect." };
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  return { success: "Password changed." };
}
