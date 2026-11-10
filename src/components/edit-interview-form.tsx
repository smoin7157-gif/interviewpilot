"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import type { InterviewSetupDefaults } from "@/lib/types";
import {
  COMPANY_TYPE_OPTIONS,
  EXPERIENCE_OPTIONS,
  INTERVIEW_TYPE_OPTIONS,
  QUESTION_COUNT_OPTIONS,
} from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";

// Mirrors the Input primitive so native selects sit in the same visual system.
const selectClass =
  "h-10 w-full rounded-xl border border-zinc-300 bg-white px-3.5 text-[15px] text-zinc-900 shadow-sm " +
  "transition-[border-color,box-shadow] focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/15";

/**
 * Edit a draft interview's setup. Submits a PATCH; the server rejects the edit
 * with 409 if questions were generated in another tab while this form was open,
 * so the message is shown rather than pretending the save worked.
 */
export function EditInterviewForm({
  sessionId,
  defaults,
}: {
  sessionId: string;
  defaults: InterviewSetupDefaults;
}) {
  const router = useRouter();
  const [role, setRole] = useState(defaults.role);
  const [seniority, setSeniority] = useState<string>(defaults.seniority);
  const [company, setCompany] = useState(defaults.company);
  const [companyType, setCompanyType] = useState(defaults.companyType);
  const [interviewType, setInterviewType] = useState(defaults.interviewType);
  const [jobDescription, setJobDescription] = useState(defaults.jobDescription);
  const [questionCount, setQuestionCount] = useState(String(defaults.questionCount));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Synchronous guard: `saving` state is not set until the next render.
  const savingRef = useRef(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;

    const trimmedRole = role.trim();
    if (trimmedRole.length < 2) {
      setError("Enter a job role.");
      return;
    }
    if (!seniority) {
      setError("Pick your experience level.");
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/interviews/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: trimmedRole,
          seniority,
          company: company.trim(),
          companyType: companyType || "",
          interviewType: interviewType || "",
          jobDescription: jobDescription.trim(),
          questionCount: Number(questionCount),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "We couldn't save those changes. Please try again.");
      router.push(`/interviews/${sessionId}`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "We couldn't save those changes. Please try again."
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm leading-snug text-red-700"
        >
          {error}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Job role" htmlFor="edit-role" required>
          <Input
            id="edit-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
            maxLength={120}
          />
        </Field>

        <Field label="Experience level" htmlFor="edit-seniority" required>
          <select
            id="edit-seniority"
            value={seniority}
            onChange={(e) => setSeniority(e.target.value)}
            required
            className={selectClass}
          >
            <option value="" disabled>
              Select level
            </option>
            {EXPERIENCE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Company" htmlFor="edit-company" hint="Optional">
          <Input
            id="edit-company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            maxLength={120}
          />
        </Field>

        <Field label="Company type" htmlFor="edit-company-type" hint="Optional">
          <select
            id="edit-company-type"
            value={companyType}
            onChange={(e) => setCompanyType(e.target.value)}
            className={selectClass}
          >
            <option value="">Not specified</option>
            {COMPANY_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Interview type" htmlFor="edit-interview-type" hint="Optional">
          <select
            id="edit-interview-type"
            value={interviewType}
            onChange={(e) => setInterviewType(e.target.value)}
            className={selectClass}
          >
            <option value="">Not specified</option>
            {INTERVIEW_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Questions" htmlFor="edit-question-count">
          <select
            id="edit-question-count"
            value={questionCount}
            onChange={(e) => setQuestionCount(e.target.value)}
            className={selectClass}
          >
            {QUESTION_COUNT_OPTIONS.map((count) => (
              <option key={count} value={count}>
                {count} questions
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Job description" htmlFor="edit-job-description" hint="Optional">
        <Textarea
          id="edit-job-description"
          rows={6}
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          maxLength={12_000}
          placeholder="Paste the posting you're targeting…"
        />
      </Field>

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.push(`/interviews/${sessionId}`)}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          <Save className="size-4" aria-hidden /> {saving ? "Saving…" : "Save setup"}
        </Button>
      </div>
    </form>
  );
}
