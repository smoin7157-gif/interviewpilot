import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getEditableInterview } from "@/lib/data";
import { EditInterviewForm } from "@/components/edit-interview-form";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = {
  title: "Edit interview setup",
  description:
    "Correct the role, experience level, company or job description before InterviewOS generates questions.",
};

export default async function EditInterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const editable = await getEditableInterview(user.id, id);
  if (!editable) notFound();
  // Generated questions are grounded in this setup; once they exist the edit
  // form has nothing safe to change. Send the user back to their practice.
  if (editable.generatedQuestions > 0) redirect(`/interviews/${id}`);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-8">
      <PageHeader
        eyebrow="Interview setup"
        title="Edit setup"
        description="Fix the role, company or job description before questions are generated. Once a set exists, its questions keep the setup they were built from."
      />
      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
        <EditInterviewForm sessionId={editable.id} defaults={editable.setup} />
      </div>
    </div>
  );
}
