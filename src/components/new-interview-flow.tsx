"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  Check,
  CircleAlert,
  FileText,
  GitBranch,
  Hash,
  Layers,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from "lucide-react";
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

type Phase = "form" | "syncing" | "generating";

interface ProjectDraft {
  name: string;
  repositoryUrl: string;
  description: string;
  techStack: string;
  contribution: string;
}

type StepKey = "session" | "github" | "resume";
type StepState = { state: "pending" | "running" | "ok" | "error"; detail?: string };

const INITIAL_STEPS: Record<StepKey, StepState> = {
  session: { state: "pending" },
  github: { state: "pending" },
  resume: { state: "pending" },
};

// Mirrors src/lib/github.ts so inline errors match what the server rejects.
const GITHUB_USERNAME_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;
const RESUME_MAX_BYTES = 3 * 1024 * 1024;

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

function SyncRow({
  step,
  label,
  detail,
  onRetry,
}: {
  step: StepState;
  label: string;
  detail?: string;
  onRetry?: () => void;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
          step.state === "ok" && "border-emerald-200 bg-emerald-50 text-emerald-600",
          step.state === "error" && "border-red-200 bg-red-50 text-red-600",
          step.state === "running" && "border-indigo-200 bg-indigo-50 text-indigo-600",
          step.state === "pending" && "border-zinc-200 bg-zinc-50 text-zinc-300"
        )}
        aria-hidden
      >
        {step.state === "ok" ? (
          <Check className="size-3" strokeWidth={3} />
        ) : step.state === "error" ? (
          <CircleAlert className="size-3" />
        ) : step.state === "running" ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <span className="size-1 rounded-full bg-current" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-zinc-900">
          {label}
          <span className="sr-only">{step.state}</span>
        </p>
        {detail && <p className="mt-0.5 text-[13px] leading-snug text-zinc-500">{detail}</p>}
      </div>
      {step.state === "error" && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-50"
        >
          Retry
        </button>
      )}
    </li>
  );
}

export function NewInterviewFlow() {
  const router = useRouter();

  // Target job
  const [role, setRole] = useState("");
  const [seniority, setSeniority] = useState("");
  const [company, setCompany] = useState("");
  const [companyType, setCompanyType] = useState("");
  const [interviewType, setInterviewType] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [count, setCount] = useState<number>(10);

  // Candidate context
  const [githubUrl, setGithubUrl] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [projects, setProjects] = useState<ProjectDraft[]>([]);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("form");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [steps, setSteps] = useState<Record<StepKey, StepState>>(INITIAL_STEPS);
  const [settled, setSettled] = useState(false);
  const syncingRef = useRef(false);

  function setFieldError(key: string, message: string) {
    setFieldErrors((prev) => {
      if (message) return prev[key] === message ? prev : { ...prev, [key]: message };
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  // Inline validation mirrors createInterviewSchema (src/lib/validation.ts),
  // the GitHub username rules (src/lib/github.ts), and the resume upload
  // limits so users see problems as they type, not just on submit.
  function validateField(key: "role" | "seniority" | "github" | "resume"): string {
    switch (key) {
      case "role": {
        const trimmed = role.trim();
        if (trimmed.length < 2) return "Enter the job role you're preparing for.";
        if (trimmed.length > 120) return "Role is too long (120 characters max).";
        return "";
      }
      case "seniority":
        return seniority ? "" : "Pick your experience level.";
      case "github": {
        const url = githubUrl.trim();
        if (!url) return "";
        const stripped = url.startsWith("@") ? url.slice(1) : url;
        const username = (stripped.match(/github\.com\/([^/?#]+)/i) ?? stripped.match(/^([^/?#]+)$/))?.[1]
          ?.replace(/\/+$/, "");
        if (!username || !GITHUB_USERNAME_RE.test(username))
          return "Enter a GitHub profile URL like https://github.com/username.";
        return "";
      }
      case "resume": {
        if (!resumeFile) return "";
        const isPdf = resumeFile.type === "application/pdf" || resumeFile.name.toLowerCase().endsWith(".pdf");
        if (!isPdf) return "That file isn't a PDF. Choose a PDF resume.";
        if (resumeFile.size > RESUME_MAX_BYTES)
          return "That resume is larger than 3 MB. Choose a smaller file.";
        return "";
      }
    }
  }

  function revalidate(key: "role" | "seniority" | "github" | "resume") {
    setFieldError(key, validateField(key));
  }

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

  const setStep = useCallback((key: StepKey, update: StepState) => {
    setSteps((prev) => ({ ...prev, [key]: update }));
  }, []);

  const runSync = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSettled(false);
    setSteps({
      session: { state: "running" },
      github: githubUrl.trim() ? { state: "running" } : { state: "pending" },
      resume: resumeFile ? { state: "running" } : { state: "pending" },
    });
    setFormError(null);

    const cleanedProjects = projects
      .filter((p) => p.name.trim().length > 0)
      .map((p) => ({
        name: p.name.trim(),
        repositoryUrl: p.repositoryUrl.trim() || undefined,
        description: p.description.trim() || undefined,
        techStack: p.techStack.trim() || undefined,
        contribution: p.contribution.trim() || undefined,
      }));

    try {
      // Recreating keeps the draft in sync with any edits made after going back.
      if (sessionId) {
        try {
          await fetch(`/api/interviews/${sessionId}`, { method: "DELETE" });
        } catch {
          // ignore cleanup errors
        }
        setSessionId(null);
      }

      const res = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          githubUrl: githubUrl.trim() || undefined,
          projects: cleanedProjects,
        }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id)
        throw new Error(
          data.error ?? "We couldn't create your interview session. Check your connection and try again."
        );
      setSessionId(data.id);
      setStep("session", { state: "ok", detail: "Interview created" });

      // GitHub attach
      if (githubUrl.trim()) {
        try {
          const gres = await fetch(`/api/interviews/${data.id}/github`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: githubUrl.trim() }),
          });
          const gdata = (await gres.json()) as {
            username?: string;
            repoCount?: number;
            languages?: string[];
            error?: string;
          };
          if (!gres.ok || !gdata.username) throw new Error(gdata.error ?? "Couldn't reach GitHub.");
          const langs = gdata.languages?.slice(0, 4).join(", ");
          setStep("github", {
            state: "ok",
            detail: `@${gdata.username} · ${gdata.repoCount} public ${gdata.repoCount === 1 ? "repo" : "repos"}${langs ? ` · ${langs}` : ""}`,
          });
        } catch (err) {
          setStep("github", {
            state: "error",
            detail: err instanceof Error ? err.message : "Couldn't reach GitHub.",
          });
        }
      }

      // Resume upload + parse
      if (resumeFile) {
        try {
          const fd = new FormData();
          fd.append("resume", resumeFile);
          const rres = await fetch(`/api/interviews/${data.id}/resume`, { method: "POST", body: fd });
          const rdata = (await rres.json()) as {
            summary?: { skills?: number; projects?: number; experience?: number };
            error?: string;
          };
          if (!rres.ok || !rdata.summary) throw new Error(rdata.error ?? "Couldn't parse that resume.");
          setStep("resume", {
            state: "ok",
            detail: `${resumeFile.name} — found ${rdata.summary.skills ?? 0} skills · ${rdata.summary.projects ?? 0} projects · ${rdata.summary.experience ?? 0} experience items`,
          });
        } catch (err) {
          setStep("resume", {
            state: "error",
            detail: err instanceof Error ? err.message : "Couldn't parse that resume.",
          });
        }
      }
    } catch (err) {
      setStep("session", {
        state: "error",
        detail: err instanceof Error ? err.message : "We couldn't create your interview session. Check your connection and try again.",
      });
    } finally {
      syncingRef.current = false;
      setSettled(true);
    }
  }, [sessionId, payload, projects, githubUrl, resumeFile, setStep]);

  function handleStartSync() {
    const keys = ["role", "seniority", "github", "resume"] as const;
    const errors: Record<string, string> = {};
    for (const key of keys) {
      const message = validateField(key);
      if (message) errors[key] = message;
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setFormError(null);
    setPhase("syncing");
    void runSync();
  }

  function goGenerate() {
    if (!sessionId) return;
    setPhase("generating");
  }

  if (phase === "generating" && sessionId) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Preparing your interview</h1>
        <p className="mt-1.5 text-[15px] text-zinc-500">
          Sit tight — we&rsquo;re tailoring questions to this role and what you told us.
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

  if (phase === "syncing") {
    const anyError = Object.values(steps).some((s) => s.state === "error");
    const sessionError = steps.session.state === "error";
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Adding your context</h1>
        <p className="mt-1.5 text-[15px] text-zinc-500">
          We&rsquo;re preparing your session before generating questions.
        </p>

        <Card className="mt-8 p-6 sm:p-8">
          <ul className="space-y-5">
            <SyncRow step={steps.session} label="Creating your interview" onRetry={runSync} />
            {githubUrl.trim() && (
              <SyncRow step={steps.github} label="Connecting your GitHub profile" onRetry={runSync} />
            )}
            {resumeFile && <SyncRow step={steps.resume} label="Reading your resume" onRetry={runSync} />}
          </ul>

          {anyError && !sessionError && (
            <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
              <p className="text-[13px] leading-snug text-amber-800">
                One or more optional sources couldn&rsquo;t be added. You can retry above or continue —
                questions will still be generated from the context we have.
              </p>
            </div>
          )}
          {sessionError && (
            <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden />
              <p className="text-[13px] leading-snug text-red-700">{steps.session.detail}</p>
            </div>
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="ghost" onClick={() => setPhase("form")}>
              <ArrowLeft className="size-4" aria-hidden /> Back to details
            </Button>
            <Button
              size="lg"
              onClick={goGenerate}
              disabled={!settled || !sessionId || sessionError}
              loading={!settled}
            >
              {settled ? "Generate questions" : "Working…"}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const updateProject = (idx: number, patch: Partial<ProjectDraft>) => {
    setProjects((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

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
              <Field label="Company" htmlFor="company" hint="Optional — e.g. Microsoft">
                <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Microsoft" />
              </Field>
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-zinc-800">
                  Company type <span className="font-normal text-zinc-400">(optional)</span>
                </p>
                <ChipGroup options={COMPANY_TYPE_OPTIONS} value={companyType} onChange={setCompanyType} ariaLabel="Company type" optional />
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
                  onChange={(e) => {
                    setRole(e.target.value);
                    if (fieldErrors.role) revalidate("role");
                  }}
                  onBlur={() => revalidate("role")}
                  placeholder="Software Development Engineer"
                  aria-invalid={Boolean(fieldErrors.role)}
                  className={fieldErrors.role ? "border-red-400 focus:border-red-500 focus:ring-red-500/15" : undefined}
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
                  onChange={(v) => {
                    setSeniority(v);
                    if (fieldErrors.seniority) revalidate("seniority");
                  }}
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
                <ChipGroup options={INTERVIEW_TYPE_OPTIONS} value={interviewType} onChange={setInterviewType} ariaLabel="Interview type" optional />
              </div>
              <Field
                label="Job description"
                htmlFor="jobDescription"
                hint={`${jobDescription.length.toLocaleString()} / 12,000 — optional, strongly recommended`}
              >
                <Textarea
                  id="jobDescription"
                  rows={6}
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
                title="Your background (optional)"
                subtitle="Resume, GitHub and projects let us ask about what you've actually built."
              />

              <div className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-sm font-medium text-zinc-800">
                  <GitBranch className="size-4 text-zinc-400" aria-hidden /> GitHub profile
                </p>
                <Input
                  id="githubUrl"
                  value={githubUrl}
                  onChange={(e) => {
                    setGithubUrl(e.target.value);
                    if (fieldErrors.github) revalidate("github");
                  }}
                  onBlur={() => revalidate("github")}
                  placeholder="https://github.com/username"
                  aria-invalid={Boolean(fieldErrors.github)}
                  aria-describedby={fieldErrors.github ? "githubUrl-error" : undefined}
                  className={fieldErrors.github ? "border-red-400 focus:border-red-500 focus:ring-red-500/15" : undefined}
                />
                {fieldErrors.github && (
                  <p id="githubUrl-error" role="alert" className="text-[13px] leading-snug text-red-600">
                    {fieldErrors.github}
                  </p>
                )}
                <p className="text-[13px] text-zinc-500">
                  We read your <span className="font-medium">public</span> repositories — never private ones — to ground
                  questions in your real work.
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-sm font-medium text-zinc-800">
                  <UploadCloud className="size-4 text-zinc-400" aria-hidden /> Resume (PDF)
                </p>
                <label
                  className={cn(
                    "flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition-colors",
                    resumeFile
                      ? "border-emerald-300 bg-emerald-50/60 hover:border-emerald-400"
                      : "border-zinc-300 bg-zinc-50/60 hover:border-zinc-400 hover:bg-zinc-50"
                  )}
                >
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setResumeFile(file);
                      revalidate("resume");
                    }}
                  />
                  {resumeFile ? (
                    <span className="text-sm font-medium text-emerald-700">
                      <Check className="mr-1.5 inline size-4" aria-hidden />
                      {resumeFile.name}
                      <span className="ml-1 font-normal text-emerald-600">— click to replace</span>
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-zinc-600">
                      <UploadCloud className="mr-1.5 inline size-4" aria-hidden /> Choose a PDF resume
                    </span>
                  )}
                </label>
                {fieldErrors.resume ? (
                  <p role="alert" className="text-[13px] leading-snug text-red-600">
                    {fieldErrors.resume}
                  </p>
                ) : resumeFile ? (
                  <p className="text-[13px] text-zinc-500">
                    Parsed on your machine&rsquo;s server — we only keep the facts it finds.
                  </p>
                ) : (
                  <p className="text-[13px] text-zinc-500">
                    Optional. We extract skills, experience, education and projects — we never invent what isn&rsquo;t there.
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-zinc-800">Projects</p>
                  <button
                    type="button"
                    onClick={() =>
                      setProjects((prev) => [
                        ...prev,
                        { name: "", repositoryUrl: "", description: "", techStack: "", contribution: "" },
                      ])
                    }
                    disabled={projects.length >= 8}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus className="size-3.5" aria-hidden /> Add project
                  </button>
                </div>
                {projects.length === 0 ? (
                  <p className="text-[13px] text-zinc-500">
                    Optional — e.g. HireAI, built with FastAPI + Supabase. Tell us the stack and what you did.
                  </p>
                ) : (
                  <ul className="space-y-4">
                    {projects.map((p, idx) => (
                      <li key={idx} className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                            Project {idx + 1}
                          </p>
                          <button
                            type="button"
                            aria-label={`Remove project ${idx + 1}`}
                            onClick={() => setProjects((prev) => prev.filter((_, i) => i !== idx))}
                            className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <Field label="Project name" htmlFor={`proj-name-${idx}`} required className="sm:col-span-1">
                            <Input
                              id={`proj-name-${idx}`}
                              value={p.name}
                              onChange={(e) => updateProject(idx, { name: e.target.value })}
                              placeholder="HireAI"
                            />
                          </Field>
                          <Field label="Repository URL" htmlFor={`proj-repo-${idx}`}>
                            <Input
                              id={`proj-repo-${idx}`}
                              value={p.repositoryUrl}
                              onChange={(e) => updateProject(idx, { repositoryUrl: e.target.value })}
                              placeholder="https://github.com/you/hireai"
                            />
                          </Field>
                          <Field label="Tech stack" htmlFor={`proj-stack-${idx}`} className="sm:col-span-2">
                            <Input
                              id={`proj-stack-${idx}`}
                              value={p.techStack}
                              onChange={(e) => updateProject(idx, { techStack: e.target.value })}
                              placeholder="FastAPI, Supabase, TypeScript"
                            />
                          </Field>
                          <Field label="What you built / your contribution" htmlFor={`proj-contribution-${idx}`}>
                            <Textarea
                              id={`proj-contribution-${idx}`}
                              rows={2}
                              value={p.contribution}
                              onChange={(e) => updateProject(idx, { contribution: e.target.value })}
                              placeholder="Designed the API and led the backend…"
                            />
                          </Field>
                          <Field label="Project description" htmlFor={`proj-desc-${idx}`}>
                            <Textarea
                              id={`proj-desc-${idx}`}
                              rows={2}
                              value={p.description}
                              onChange={(e) => updateProject(idx, { description: e.target.value })}
                              placeholder="What the project does and who uses it…"
                            />
                          </Field>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <hr className="border-zinc-100" />

            <section className="space-y-5">
              <SectionTitle
                step="4"
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
              Your details are only used to generate your questions. This is private practice — nothing is sent to an employer.
            </p>
            <Button size="lg" onClick={handleStartSync} className="sm:w-auto">
              Generate Interview
            </Button>
          </div>
        </Card>

        <aside className="space-y-4 lg:sticky lg:top-0 lg:self-start">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-zinc-900">Interview summary</h2>
            <dl className="mt-4 space-y-3.5">
              <SummaryRow icon={BriefcaseBusiness} label="Role" value={role || "—"} />
              <SummaryRow icon={Hash} label="Experience" value={seniority || "—"} />
              <SummaryRow
                icon={Building2}
                label="Company"
                value={company ? (companyType ? `${company} · ${companyType}` : company) : companyType || "—"}
              />
              <SummaryRow icon={Layers} label="Interview type" value={interviewType || "General mix"} />
              <SummaryRow
                icon={FileText}
                label="Context"
                value={[
                  jobDescription ? "JD pasted" : "",
                  resumeFile ? "Resume" : "",
                  githubUrl.trim() ? "GitHub" : "",
                  projects.filter((p) => p.name.trim()).length > 0
                    ? `${projects.filter((p) => p.name.trim()).length} projects`
                    : "",
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              />
            </dl>
          </Card>
          <Card className="p-5">
            <p className="text-[13px] leading-relaxed text-zinc-500">
              Questions are built from the job description first, then your role, interview type, experience, and
              company — and reference your resume, GitHub and projects when you add them. Suggested answers and
              follow-ups come with every question.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function SummaryRow({ icon: Icon, label, value }: { icon: typeof BriefcaseBusiness; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-zinc-400" aria-hidden />
      <div className="min-w-0">
        <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</dt>
        <dd className="mt-0.5 text-sm text-zinc-800">{value}</dd>
      </div>
    </div>
  );
}
