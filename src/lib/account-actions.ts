"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { DATABASE_UNAVAILABLE_MESSAGE, isDatabaseUnreachable } from "@/lib/db-errors";
import { clearSessionCookie, getSessionUser, verifyPassword } from "@/lib/auth";
import { deleteAccountSchema } from "@/lib/validation";

export type AccountActionState = { error?: string; fieldErrors?: Record<string, string[]>; success?: string };

export async function deleteAccountAction(
  _prev: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in again to delete your account." };

  const parsed = deleteAccountSchema.safeParse({
    confirmEmail: formData.get("confirmEmail"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { confirmEmail, password } = parsed.data;

  if (confirmEmail.toLowerCase() !== user.email.toLowerCase()) {
    return { fieldErrors: { confirmEmail: ["Email must match your account address."] } };
  }

  const row = await prisma.user.findUnique({ where: { id: user.id } });
  if (!row) return { error: "Account not found." };

  const ok = await verifyPassword(password, row.passwordHash);
  if (!ok) return { fieldErrors: { password: ["Incorrect password."] } };

  try {
    await prisma.user.delete({ where: { id: user.id } });
  } catch (error) {
    if (isDatabaseUnreachable(error)) return { error: DATABASE_UNAVAILABLE_MESSAGE };
    throw error;
  }

  await clearSessionCookie();
  revalidatePath("/", "layout");
  redirect("/?deleted=1");
}