import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getInterviewSetupDefaults } from "@/lib/data";
import { NewInterviewFlow } from "@/components/new-interview-flow";

export const metadata: Metadata = { title: "New Interview" };

/**
 * The setup form, optionally prefilled from an existing interview.
 *
 * `?from=<sessionId>` powers "practice again with this setup": the same role,
 * experience, company, interview type and job description are read server-side
 * from an owned session, so a user can run the same interview again without
 * retyping it. The defaults are looked up rather than passed in the URL (a job
 * description would blow past a sensible query string), and a session the
 * caller doesn't own simply yields a blank form.
 */
export default async function NewInterviewPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const user = await requireUser();
  const { from } = await searchParams;
  const defaults = from ? await getInterviewSetupDefaults(user.id, from) : null;

  return <NewInterviewFlow defaults={defaults} />;
}
