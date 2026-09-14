"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

export type AuthActionState = { error?: string; fieldErrors?: Record<string, string[]>; success?: string };

export async function signupAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
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

export async function loginAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
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
  if (!user) {
    return { error: "No account found with that email." };
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return { error: "Incorrect password. Please try again." };
  }

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
