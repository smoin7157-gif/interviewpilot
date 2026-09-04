"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, Building2, FileText, Hash, Layers, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  COMPANY_TYPE_OPTIONS,
  EXPERIENCE_OPTIONS,
  INTERVIEW_TYPE_OPTIONS,
  QUESTION_COUNT_OPTIONS,
} from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { GeneratePanel, type GenerationContextPayload } from "@/components/generate-interview";

type Phase = "form" | "generating";

function SectionTitle({ step, title, subtitle }: { step: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700">
        {step}
      </span>
      <div>
        <h2 className="text-[15px] font-semibold text-zinc-950">{title}</h2>
        <p className="text-[13px] text-zinc-500">{subtitle}</p>
      </div>
    </div>
  );
}

function ChipGroup({
  options,
  value,
  onChange,
  ariaLabel,
  optional = false,
}: {
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  /** When true the selection can be cleared by clicking the active chip. */
  optional?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {options.map((option) => {
        const selected = value === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(selected && optional ? "" : option)}
            className={cn(
              "flex h-10 items-center justify-center rounded-lg border text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
              selected
                ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600"
                : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export function NewInterviewFlow() {
  const router = useRouter();

  const [role, setRole] = useState("");
  const [seniority, setSeniority] = useState("");
  const [company, setCompany] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [interviewType, setInterviewType] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [count, setCount] = useState<number>(10);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [phase, setPhase] = useState<Phase>("form");
  const [sessionId, setSessionId] = useState<string | null>(null);

  const payload: GenerationContextPayload = useMemo(
    () => ({
      role: role.trim(),
      seniority,
      company: company.trim() || null,
      companyType: companyType || null,
      interviewType: interviewType || null,
      jobDescription: jobDescription.trim() || null,
      count,
    }),
    [role, seniority, company, companyType, interviewType, jobDescription, count]
  );

  async function handleGenerate() {
    const errors: Record<string, string> = {};
    if (role.trim().length < 2) errors.role = "Enter the job role you're preparing for.";
    if (!seniority) errors.seniority = "Pick your experience level.";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setFormError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) {
        throw new Error(data.error ?? "Couldn't create the interview.");
      }
      setSessionId(data.id);
      setPhase("generating");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't create the interview. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  if (phase === "generating" && sessionId) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Preparing your interview</h1>
        <p className="mt-1.5 text-[15px] text-zinc-500">
          Sit tight — we&rsquo;re tailoring questions to this specific role.
        </p>
        <div className="mt-8">
          <GeneratePanel
            sessionId={sessionId}
            context={payload}
            onDone={() => router.replace(`/interviews/${sessionId}`)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-8">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-[28px]">
        Prepare for your interview
      </h1>
      <p className="mt-1.5 text-[15px] text-zinc-500">
        Give InterviewOS enough context to make your practice relevant to the job you&rsquo;re targeting.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
        <Card className="p-6 sm:p-8">
          {formError && (
            <div role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="space-y-8">
            <section className="space-y-5">
              <SectionTitle
                step="1"
                title="Target job"
                subtitle="What you're preparing for — this shapes every question we generate."
              />
              <Field
                label="Company"
                htmlFor="company"
                hint="Optional — e.g. Microsoft"
              >
                <Input
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Microsoft"
                />
              </Field>
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-zinc-800">
                  Company type <span className="font-normal text-zinc-400">(optional)</span>
                </p>
                <ChipGroup
                  options={COMPANY_TYPE_OPTIONS}
                  value={companyType}
                  onChange={setCompanyType}
                  ariaLabel="Company type"
                  optional
                />
              </div>
              <Field
                label="Job role"
                htmlFor="role"
                required
                error={fieldErrors.role}
                hint="e.g. Software Development Engineer"
              >
                <Input
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Software Development Engineer"
                  autoFocus
                />
              </Field>
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-zinc-800">
                    Experience level
                    <span className="ml-0.5 text-zinc-400" aria-hidden>*</span>
                  </span>
                </div>
                <ChipGroup
                  options={EXPERIENCE_OPTIONS}
                  value={seniority}
                  onChange={setSeniority}
                  ariaLabel="Experience level"
                />
                {fieldErrors.seniority && (
                  <p role="alert" className="text-[13px] leading-snug text-red-600">
                    {fieldErrors.seniority}
                  </p>
                )}
              </div>
            </section>

            <hr className="border-zinc-100" />

            <section className="space-y-5">
              <SectionTitle
                step="2"
                title="Interview type"
                subtitle="Recommended — matches the questions to the format you'll actually face."
              />
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-zinc-800">
                  Interview type <span className="font-normal text-zinc-400">(optional)</span>
                </p>
                <ChipGroup
                  options={INTERVIEW_TYPE_OPTIONS}
                  value={interviewType}
                  onChange={setInterviewType}
                  ariaLabel="Interview type"
                  optional
                />
              </div>
              <Field
                label="Job description"
                htmlFor="jobDescription"
                hint={`${jobDescription.length.toLocaleString()} / 12,000 — optional, strongly recommended`}
              >
                <Textarea
                  id="jobDescription"
                  rows={7}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value.slice(0, 12_000))}
                  placeholder="Paste the job description here…"
                />
              </Field>
            </section>

            <hr className="border-zinc-100" />

            <section className="space-y-5">
              <SectionTitle
                step="3"
                title="Number of questions"
                subtitle="Keep the first session fast and focused."
              />
              <ChipGroup
                options={QUESTION_COUNT_OPTIONS.map(String)}
                value={String(count)}
                onChange={(v) => setCount(Number(v))}
                ariaLabel="Number of questions"
              />
            </section>
          </div>

          <div className="mt-10 flex flex-col gap-4 border-t border-zinc-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-1.5 text-[13px] text-zinc-400">
              <ShieldCheck className="size-4 text-zinc-300" aria-hidden />
              Your details are only used to generate your questions.
            </p>
            <Button size="lg" onClick={handleGenerate} loading={creating} className="sm:w-auto">
              {creating ? "Preparing…" : "Generate Interview"}
            </Button>
          </div>
        </Card>

        <aside className="space-y-4 lg:sticky lg:top-0 lg:self-start">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-zinc-900">Interview summary</h2>
            <dl className="mt-4 space-y-3.5">
              <div className="flex items-start gap-3">
                <BriefcaseBusiness className="mt-0.5 size-4 shrink-0 text-zinc-400" aria-hidden />
                <div className="min-w-0">
                  <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">Role</dt>
                  <dd className="mt-0.5 text-sm text-zinc-800">{role || "—"}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Hash className="mt-0.5 size-4 shrink-0 text-zinc-400" aria-hidden />
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">Experience</dt>
                  <dd className="mt-0.5 text-sm text-zinc-800">{seniority || "—"}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 size-4 shrink-0 text-zinc-400" aria-hidden />
                <div className="min-w-0">
                  <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">Company</dt>
                  <dd className="mt-0.5 text-sm text-zinc-800">
                    {company || "—"}
                    {companyType ? ` · ${companyType}` : ""}
                  </dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Layers className="mt-0.5 size-4 shrink-0 text-zinc-400" aria-hidden />
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">Interview type</dt>
                  <dd className="mt-0.5 text-sm text-zinc-800">{interviewType || "General mix"}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 size-4 shrink-0 text-zinc-400" aria-hidden />
                <div className="min-w-0">
                  <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">Context</dt>
                  <dd className="mt-0.5 text-sm text-zinc-800">{jobDescription ? "JD pasted" : "No JD"}</dd>
                </div>
              </div>
            </dl>
          </Card>
          <Card className="p-5">
            <p className="text-[13px] leading-relaxed text-zinc-500">
              Questions are built from the job description first, then the role, interview type,
              experience level, company type, and company. Suggested answers and follow-ups come
              with every question.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
