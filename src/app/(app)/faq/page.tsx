import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChevronDown, MessagesSquare } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "FAQ" };

const FAQ_GROUPS: { heading: string; items: { q: string; a: string }[] }[] = [
  {
    heading: "Getting started",
    items: [
      {
        q: "What is InterviewOS?",
        a: "InterviewOS is an interview practice workspace. You tell it about the job you're targeting — the role (for example \"Security Engineer\"), your experience level, the company, company type, interview type, and optionally the job description — and it generates realistic interview questions you can practice against. After you submit an answer, it scores your response and gives you feedback so you can sharpen your delivery before the real thing.",
      },
      {
        q: "How do I start a practice session?",
        a: "Click \"Create Interview\" in the sidebar. Fill in your target job — job role and experience level are required; company, company type, interview type, and a pasted job description add context. You can also add your resume (PDF), GitHub profile, and projects so questions reference what you've actually built. Choose 10, 15, or 20 questions, and generate. Open the interview from \"My Interviews\" and start answering each question one at a time.",
      },
      {
        q: "What roles can I practice?",
        a: "Any role you can type. Roles are freeform text, so you can practice for a Security Engineer, Frontend Engineer, Product Manager, Data Scientist, or any other title. Adding an experience level, interview type, company, and job description makes the questions more specific to what you'll actually face.",
      },
    ],
  },
  {
    heading: "History, data & limits",
    items: [
      {
        q: "Where is my practice history stored?",
        a: "Everything is stored in the app's database and tied to your account. Each interview you create is saved, along with its generated questions and every answer you submit. Your dashboard shows your most recent interviews, \"My Interviews\" lists them all with progress, and inside each interview you can review your past attempts and scores per question.",
      },
      {
        q: "How can I see my previous answers and scores?",
        a: "Open an interview from \"My Interviews\" and select a question. There you'll see its status (not started, practiced, or skipped) and your previous attempts with the score you received each time. The dashboard also shows progress per interview at a glance.",
      },
      {
        q: "Is there a limit on interviews, questions, or attempts?",
        a: "There are no caps on how many interviews you create or questions you practice. To keep the AI fast and reliable for everyone, a few actions are rate-limited per hour — things like generating interviews, running mock sessions, and requesting debriefs. If you hit a limit you'll see a clear message telling you how long to wait; your data is never affected.",
      },
      {
        q: "Can I delete an interview?",
        a: "Yes. Open the \"⋯\" menu on any interview card (on the My Interviews page or inside the interview) and choose \"Delete interview\". This removes the interview, its questions, and its practice history. It can't be undone.",
      },
    ],
  },
  {
    heading: "Voice mock interviews & debriefs",
    items: [
      {
        q: "How does the AI mock interview work?",
        a: "Open any generated interview and press \"Practice aloud\". After a quick microphone check, an AI interviewer asks your questions out loud, listens to your spoken answers, and reacts with live follow-ups — one question at a time. Speech recognition and voice playback run entirely in your browser; your audio is never recorded or uploaded, only the text transcript is saved. You can also type answers at any point if you'd rather not speak.",
      },
      {
        q: "What is the debrief and how is my score calculated?",
        a: "When a mock interview ends, InterviewOS reviews your saved transcript and produces a debrief: an overall practice score plus a breakdown across six dimensions — technical depth, communication, structure, relevance, project knowledge, and problem solving — along with strengths, weaknesses, your strongest and weakest answers, and a recommended practice list. Scores reflect that practice session only; they are not a prediction of interview outcomes.",
      },
      {
        q: "Can I review past mock interviews?",
        a: "Yes. Every completed session is saved under \"Mock History\" in the sidebar, with its score, transcript, and full debrief. You can re-practice the same interview anytime, and unfinished mock sessions resume exactly where you left off.",
      },
      {
        q: "Which browser should I use for voice practice?",
        a: "Chrome or Edge give the best voice-recognition experience. If your browser doesn't support speech recognition, the mock interview still works — you'll be offered a text box to type your answers instead, and the session is scored the same way.",
      },
    ],
  },
  {
    heading: "Scoring, AI & privacy",
    items: [
      {
        q: "How does the AI score my answers?",
        a: "When you submit an answer, the AI evaluates it against the question and the role you're targeting, returning a score along with feedback on what went well and what to improve. Every submission is stored as an attempt so you can track improvement over time.",
      },
      {
        q: "What happens if the AI isn't available?",
        a: "InterviewOS falls back to a built-in question bank and a deterministic evaluator, so you can keep practicing even when the AI service isn't reachable or isn't configured. Your interviews and history are never lost, and the app always tells you which mode produced your feedback.",
      },
      {
        q: "Who can see my data?",
        a: "Only you. Every interview, question, and answer is scoped to your account, and all pages and API routes check that you're signed in before showing or modifying anything. Signing out protects the same session everywhere in the app.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-8">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-600">
          <MessagesSquare className="size-3.5" aria-hidden />
          Help Center
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-950 sm:text-[28px]">
          Frequently asked questions
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-[15px] leading-relaxed text-zinc-500">
          Everything you need to know about practicing, your history, and how your data is handled.
        </p>
      </div>

      <div className="mt-10 space-y-8">
        {FAQ_GROUPS.map((group) => (
          <section key={group.heading} aria-labelledby={group.heading.replace(/\s+/g, "-").toLowerCase()}>
            <h2
              id={group.heading.replace(/\s+/g, "-").toLowerCase()}
              className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400"
            >
              {group.heading}
            </h2>
            <div className="space-y-3">
              {group.items.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-2xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(16,21,40,.05),0_8px_24px_-16px_rgba(16,21,40,.14)] transition-colors open:border-indigo-200"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left select-none [&::-webkit-details-marker]:hidden">
                    <span className="text-[15px] font-semibold text-zinc-900">{item.q}</span>
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition-colors group-open:bg-indigo-50 group-open:text-indigo-600">
                      <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
                    </span>
                  </summary>
                  <div className="px-5 pb-5">
                    <p className="text-[15px] leading-relaxed text-zinc-600">{item.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-6 text-center sm:p-8">
        <h2 className="text-lg font-semibold text-zinc-950">Still have questions?</h2>
        <p className="mx-auto mt-1.5 max-w-md text-[15px] leading-relaxed text-zinc-500">
          The best way to see how it works is to try it — create an interview for the role you&rsquo;re
          targeting and practice a question.
        </p>
        <Link
          href="/interviews/new"
          className={buttonClasses({ size: "lg", className: "mt-5" })}
        >
          Create an interview <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
