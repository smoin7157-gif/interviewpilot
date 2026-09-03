import Link from "next/link";
import { ArrowRight, FileQuestion, Lightbulb, ListChecks, Sparkles, Target, UserRound } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { buttonClasses } from "@/components/ui/button";

const features = [
  {
    icon: Target,
    title: "Role-specific questions",
    body: "Questions tailored to the job you're targeting — your role, seniority, and the actual job description when you have one.",
  },
  {
    icon: Lightbulb,
    title: "Suggested answers",
    body: "Practice first, then see a strong, natural example you can compare your own answer against.",
  },
  {
    icon: ListChecks,
    title: "Follow-up questions",
    body: "Go deeper instead of practicing isolated questions, the way a real interviewer would.",
  },
];

const steps = [
  {
    icon: UserRound,
    step: "01",
    title: "Pick your role",
    body: "Tell us the job you're preparing for, your level, and optionally paste the job description.",
  },
  {
    icon: Sparkles,
    step: "02",
    title: "Generate the interview",
    body: "We build a realistic question set with context for each question and suggested answers.",
  },
  {
    icon: FileQuestion,
    step: "03",
    title: "Practice and get feedback",
    body: "Answer out loud or in writing, compare with the suggestion, and get specific feedback on your answer.",
  },
];

export default async function Home() {
  const user = await getSessionUser();
  const primaryHref = user ? "/dashboard" : "/signup";
  const primaryLabel = user ? "Open your dashboard" : "Start Practicing";

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="border-b border-zinc-100">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Logo href="/" />
          <nav className="flex items-center gap-2">
            {user ? (
              <Link
                href="/dashboard"
                className={buttonClasses({ variant: "outline" }) + " inline-flex items-center gap-2"}
              >
                Dashboard <ArrowRight className="size-4" aria-hidden />
              </Link>
            ) : (
              <>
                <Link href="/login" className={buttonClasses({ variant: "ghost" })}>
                  Log in
                </Link>
                <Link href="/signup" className={buttonClasses({})}>
                  Start Practicing
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="border-b border-zinc-100">
          <div className="mx-auto flex max-w-6xl flex-col items-center px-6 pb-20 pt-24 text-center sm:pb-28 sm:pt-32">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[13px] font-medium text-zinc-600">
              <Sparkles className="size-3.5 text-indigo-500" aria-hidden />
              AI-powered interview practice
            </span>
            <h1 className="mt-6 max-w-3xl text-balance text-4xl font-semibold leading-[1.1] tracking-tight text-zinc-950 sm:text-6xl">
              Practice smarter. Walk into every interview prepared.
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-zinc-600">
              Generate realistic interview questions for the role you&rsquo;re targeting, practice your
              answers, and learn what strong responses should look like.
            </p>
            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
              <Link href={primaryHref} className={buttonClasses({ size: "lg" })}>
                {primaryLabel}
              </Link>
              <Link href="#how-it-works" className={buttonClasses({ size: "lg", variant: "outline" })}>
                See how it works
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-b border-zinc-100">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 py-20 sm:py-24 md:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-zinc-200 bg-white p-7 transition-colors hover:border-zinc-300"
              >
                <div className="flex size-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <feature.icon className="size-5" aria-hidden />
                </div>
                <h2 className="mt-5 text-base font-semibold text-zinc-950">{feature.title}</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-zinc-600">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="bg-zinc-50">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <h2 className="text-center text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
              From role to ready in three steps
            </h2>
            <div className="mx-auto mt-12 grid max-w-4xl gap-8 sm:grid-cols-3 sm:gap-6">
              {steps.map((step) => (
                <div key={step.step} className="flex flex-col items-start sm:items-center sm:text-center">
                  <div className="flex items-center gap-3">
                    <step.icon className="size-5 text-indigo-600" aria-hidden />
                    <span className="text-sm font-medium tabular-nums text-zinc-400">{step.step}</span>
                  </div>
                  <h3 className="mt-3 text-[15px] font-semibold text-zinc-950">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{step.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-14 text-center">
              <Link href={primaryHref} className={buttonClasses({ size: "lg" })}>
                {primaryLabel}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-zinc-500 sm:flex-row">
          <Logo href="/" />
          <p className="order-first text-zinc-500 sm:order-last">
            AI-powered interview practice built around the job you actually want.
          </p>
        </div>
      </footer>
    </div>
  );
}
