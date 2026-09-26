import Link from "next/link";
import {
  ArrowRight,
  FileQuestion,
  ListChecks,
  MessagesSquare,
  Mic,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  Zap,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { buttonClasses } from "@/components/ui/button";

const features = [
  {
    icon: Target,
    title: "Role-specific questions",
    body: "Questions tailored to the job you're targeting — your role, experience level, interview type, and the actual job description when you have one.",
    tag: "01",
  },
  {
    icon: Mic,
    title: "Voice mock interviews",
    body: "Practice aloud with an AI interviewer that asks live follow-ups — just like the real thing, in your browser.",
    tag: "02",
  },
  {
    icon: Sparkles,
    title: "Scored debriefs",
    body: "Every mock ends with a score across six dimensions, strengths, gaps, and exactly what to practice next.",
    tag: "03",
  },
];

const steps = [
  {
    icon: UserRound,
    step: "01",
    title: "Pick your role",
    body: "Tell us the job you're preparing for — role, experience level, company type, interview type, and optionally the job description.",
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
    body: "Answer out loud in a voice mock or in writing, compare with the suggestion, and get specific feedback on every answer.",
  },
  {
    icon: ListChecks,
    step: "04",
    title: "Review your debrief",
    body: "Finish with a scored debrief — strengths, gaps, and a recommended practice list — saved to your history.",
  },
];

const trust = [
  {
    icon: Zap,
    title: "Built for the role",
    body: "Every question is generated around the exact job you're walking into — not generic lists.",
  },
  {
    icon: Mic,
    title: "Speak your answers",
    body: "Run full spoken mock interviews in your browser — audio never leaves your device.",
  },
  {
    icon: MessagesSquare,
    title: "Feedback that lands",
    body: "Each answer gets scored with strengths, what's missing, and what to say differently.",
  },
  {
    icon: ShieldCheck,
    title: "Your practice stays yours",
    body: "Sessions are private to your account, and everything you answer is stored only for you.",
  },
];

export default async function Home() {
  const user = await getSessionUser();
  const primaryHref = user ? "/dashboard" : "/signup";
  const primaryLabel = user ? "Open your dashboard" : "Start practicing";

  return (
    <div className="flex min-h-dvh flex-col bg-[#fbfcfe]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-200/70 bg-[#fbfcfe]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
          <Logo href="/" />
          <nav aria-label="Primary" className="flex items-center gap-1.5">
            <Link
              href="#features"
              className="hidden rounded-full px-3.5 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 sm:block"
            >
              Why InterviewOS
            </Link>
            <Link
              href="#how-it-works"
              className="hidden rounded-full px-3.5 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 sm:block"
            >
              How it works
            </Link>
            {user ? (
              <Link
                href="/dashboard"
                className={buttonClasses({ variant: "outline", className: "ml-2" })}
              >
                Dashboard <ArrowRight className="size-4" aria-hidden />
              </Link>
            ) : (
              <>
                <Link href="/login" className={buttonClasses({ variant: "ghost" })}>
                  Log in
                </Link>
                <Link href="/signup" className={buttonClasses({ className: "ml-1" })}>
                  Start practicing
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="outline-none">
        {/* Hero */}
        <section className="relative overflow-hidden">
          {/* Ambient glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
            style={{
              background:
                "radial-gradient(closest-side, rgba(61,78,224,.14), rgba(110,92,245,.1), transparent)",
            }}
          />
          <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 pb-24 pt-20 text-center sm:pb-32 sm:pt-28">
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-[13px] font-semibold text-indigo-700">
              <Sparkles className="size-3.5 text-indigo-500" aria-hidden />
              AI-powered interview practice
            </span>
            <h1 className="mt-7 max-w-4xl text-balance text-5xl font-extrabold leading-[1.04] tracking-[-0.035em] text-zinc-950 sm:text-[64px]">
              Practice your interview{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent">
                before the real one.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-zinc-500">
              Tell InterviewOS about the job you&rsquo;re targeting, then practice realistic questions —
              written or spoken aloud with an AI interviewer — with scored feedback and a debrief on
              every session.
            </p>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
              <Link href={primaryHref} className={buttonClasses({ size: "lg" })}>
                {primaryLabel} <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="#how-it-works"
                className={buttonClasses({ size: "lg", variant: "outline" })}
              >
                See how it works
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-[13px] font-medium text-zinc-500">
              <span className="rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-zinc-600 shadow-sm">
                Free to start
              </span>
              <span className="rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-zinc-600 shadow-sm">
                Written + voice practice
              </span>
              <span className="rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-zinc-600 shadow-sm">
                No credit card
              </span>
            </div>
          </div>
        </section>

        {/* Trust strip */}
        <section className="border-y border-zinc-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-4 px-6 py-5 sm:grid-cols-3">
            {trust.map((item) => (
              <div key={item.title} className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <item.icon className="size-4.5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900">{item.title}</p>
                  <p className="truncate text-[13px] text-zinc-500">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-24 sm:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
              Why InterviewOS
            </p>
            <h2 className="mt-4 text-balance text-4xl font-bold tracking-[-0.03em] text-zinc-950 sm:text-[44px] sm:leading-[1.08]">
              Your practice should look like the real interview.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-zinc-500">
              Generic question banks rehearse you for nothing in particular. InterviewOS builds
              each session around the job you actually want.
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-4xl gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group relative overflow-hidden rounded-3xl border border-zinc-200 bg-white p-7 shadow-[0_1px_2px_rgba(16,21,40,.05),0_8px_24px_-16px_rgba(16,21,40,.14)] transition-all duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_2px_4px_rgba(16,21,40,.04),0_24px_48px_-20px_rgba(61,78,224,.25)]"
              >
                <span className="font-display absolute right-5 top-5 text-sm font-bold tabular-nums text-zinc-200 transition-colors group-hover:text-indigo-200">
                  {feature.tag}
                </span>
                <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-400 text-white shadow-[0_8px_16px_-8px_rgba(61,78,224,.6)]">
                  <feature.icon className="size-5" aria-hidden />
                </div>
                <h2 className="mt-6 text-lg font-bold tracking-[-0.02em] text-zinc-950">
                  {feature.title}
                </h2>
                <p className="mt-2.5 text-[15px] leading-relaxed text-zinc-500">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works — dark panel */}
        <section id="how-it-works" className="scroll-mt-20 bg-[#0b1020]">
          <div className="mx-auto max-w-6xl px-6 py-24 sm:py-28">
            <div className="mx-auto max-w-2xl text-center">
              <p className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-[#9c8bff]">
                How it works
              </p>
              <h2 className="mt-4 text-balance text-4xl font-bold tracking-[-0.03em] text-white sm:text-[44px] sm:leading-[1.08]">
                From role to ready in four steps.
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-[#b8c0de]">
                No spreadsheets, no generic lists — just a focused session you can finish before the
                interview.
              </p>
            </div>

            <div className="mx-auto mt-16 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step) => (
                <div
                  key={step.step}
                  className="rounded-3xl border border-white/10 bg-white/[0.04] p-7 backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-indigo-400 font-display text-sm font-bold text-white">
                      {step.step}
                    </span>
                    <step.icon className="size-5 text-[#6e78a0]" aria-hidden />
                  </div>
                  <h3 className="mt-6 text-lg font-bold tracking-[-0.02em] text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2.5 text-[15px] leading-relaxed text-[#b8c0de]">{step.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-14 text-center">
              <Link href={primaryHref} className={buttonClasses({ size: "lg" })}>
                {user ? "Open your dashboard" : "Start practicing"}{" "}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-6xl px-6 py-24 sm:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
              One account, every interview
            </p>
            <h2 className="mt-4 text-balance text-4xl font-bold tracking-[-0.03em] text-zinc-950 sm:text-[44px] sm:leading-[1.08]">
              The best time to practice was before the call. The second best is now.
            </h2>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href={primaryHref} className={buttonClasses({ size: "lg" })}>
                {primaryLabel} <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link href="#how-it-works" className={buttonClasses({ size: "lg", variant: "outline" })}>
                Learn how it works
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 bg-white">
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
