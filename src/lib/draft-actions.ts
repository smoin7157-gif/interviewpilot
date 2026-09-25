"use server";

import { requireApiUser } from "@/lib/auth";
import { saveQuestionDraft } from "@/lib/data";
import { checkRateLimit } from "@/lib/rate-limit";
import { questionDraftSchema } from "@/lib/validation";

export type SaveAnswerDraftResult =
  | { ok: true; draftSavedAt: string | null }
  | { ok: false; error: string };

/**
 * Autosave one written-practice answer.
 *
 * Server Functions are reachable by direct POST, so this authenticates and
 * authorizes on every call: the user comes from the session cookie and the
 * write is scoped to `session.userId` inside `saveQuestionDraft` — a foreign
 * question id persists nothing. Returns an error object instead of throwing so
 * the client can keep the text in its local buffer and retry on the next edit.
 *
 * No `revalidatePath`: an autosave is not a page change, and re-rendering the
 * workspace mid-typing would fight the textarea.
 */
export async function saveAnswerDraftAction(
  questionId: string,
  draftAnswer: string
): Promise<SaveAnswerDraftResult> {
  const user = await requireApiUser();
  if (!user) return { ok: false, error: "Unauthorized" };

  // Autosave is chatty by design (one call per typing pause), so the ceiling is
  // deliberately far above human cadence — it only stops a runaway loop from
  // hammering the DB, never a person typing.
  const rl = checkRateLimit(`draft:${user.id}`, { limit: 300, windowMs: 5 * 60 * 1000 });
  if (!rl.ok) return { ok: false, error: "Saving too often — give it a moment." };

  const parsed = questionDraftSchema.safeParse({ questionId, draftAnswer });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid draft." };
  }

  const saved = await saveQuestionDraft(user.id, parsed.data.questionId, parsed.data.draftAnswer);
  if (!saved) return { ok: false, error: "Question not found." };

  return { ok: true, draftSavedAt: saved.draftSavedAt?.toISOString() ?? null };
}
