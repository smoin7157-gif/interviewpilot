import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { LegalDocument, LegalSection } from "@/components/legal-document";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "What InterviewOS stores, why it stores it, how voice and AI processing work, and the control you have over your data.",
  alternates: { canonical: "/privacy" },
};

const ISSUES_URL = "https://github.com/smoin7157-gif/interviewpilot/issues";

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Privacy policy"
        description="What InterviewOS stores, why it stores it, and the control you have over your data."
      />

      <LegalDocument updated="November 9, 2026">
        <LegalSection title="The short version">
          <p>
            InterviewOS stores the account details and practice material you provide so it can
            generate questions, score answers, and show your history. It does not sell your data,
            and this build has no advertising or third-party analytics trackers. Voice and camera
            input stay in your browser &mdash; only text transcripts are saved.
          </p>
        </LegalSection>

        <LegalSection title="What we collect">
          <p>Information you provide:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong className="font-semibold text-zinc-800">Account details</strong> &mdash; your
              name, email address, and a bcrypt hash of your password. The plain-text password is
              never stored.
            </li>
            <li>
              <strong className="font-semibold text-zinc-800">Target-job setup</strong> &mdash; the
              role and experience level you enter, plus any company, company type, interview type,
              or job description you add.
            </li>
            <li>
              <strong className="font-semibold text-zinc-800">Candidate context</strong> &mdash; an
              optional resume PDF, GitHub profile URL, and manual projects. The app extracts text
              and facts from a resume but does not keep the uploaded file; it stores the original
              filename and the extracted skills, experience, education, projects, achievements,
              certifications, and technologies.
            </li>
          </ul>

          <p>Information created as you practice:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Generated questions, suggested answers, and follow-ups.</li>
            <li>Written drafts, submitted answers, scores, and feedback.</li>
            <li>
              Mock-interview transcripts (the interviewer&rsquo;s questions and your spoken
              answers) and the debrief generated from them.
            </li>
          </ul>

          <p>
            <strong className="font-semibold text-zinc-800">Technical information</strong> &mdash;
            a signed session cookie keeps you logged in, and the hosting provider may keep standard
            request and error logs.
          </p>
        </LegalSection>

        <LegalSection title="How we use it">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Generate role-specific questions, follow-ups, and suggested answers.</li>
            <li>Evaluate written answers and produce mock-interview debriefs.</li>
            <li>Save and display your practice history, scores, and progress.</li>
            <li>Keep the service secure, prevent abuse, and enforce rate limits.</li>
            <li>Operate, troubleshoot, and improve the service.</li>
          </ul>
          <p>
            We do not sell personal information, and we do not use your practice content for
            advertising.
          </p>
        </LegalSection>

        <LegalSection title="AI providers and other third parties">
          <p>
            When you generate questions, upload a resume, submit an answer, run a mock interview,
            or request a debrief, the relevant text is sent to OpenRouter, which routes it to the
            language model configured for this deployment. The model provider processes that text
            under its own terms and privacy policy. Prompts never contain your account password.
          </p>
          <p>
            If you attach a GitHub profile, the app reads public profile and repository data
            through GitHub&rsquo;s API and stores a summary. The app also relies on its hosting and
            database providers to run; those providers process data on the operator&rsquo;s behalf.
          </p>
          <p>
            A resume or job description is text you choose to submit, so it may contain personal
            details such as your name or contact information. Only include what you are comfortable
            having processed.
          </p>
        </LegalSection>

        <LegalSection title="Cookies">
          <p>
            The app sets one essential cookie,{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[13px] text-zinc-700">
              ip_session
            </code>
            , which is httpOnly and used only to keep you signed in. It contains a signed session
            token, not your password. This build sets no advertising or analytics cookies. Clearing
            cookies or signing out ends the session in that browser.
          </p>
        </LegalSection>

        <LegalSection title="Voice, camera, and microphone">
          <p>
            Mock interviews use your browser&rsquo;s speech recognition and speech synthesis.
            InterviewOS does not record or upload audio, and the optional camera self-view is
            displayed locally only. Depending on the browser, the browser vendor may process
            microphone audio to produce a transcript under its own privacy policy; Chrome and Edge,
            for example, use their vendor&rsquo;s speech service. If you would rather not use a
            microphone, typed answers are supported.
          </p>
        </LegalSection>

        <LegalSection title="Retention and deletion">
          <p>
            Practice data is kept until you delete it or ask for your account to be removed.
            Deleting an interview removes its questions and attempts; deleting a mock session
            removes its transcript and debrief. Some backup copies may persist for a short period
            before they are overwritten.
          </p>
          <p>
            To request deletion of your account and all associated data, contact the operator using
            the project issue tracker linked below. Include the email address on the account so the
            request can be matched.
          </p>
        </LegalSection>

        <LegalSection title="Security">
          <p>
            Passwords are hashed with bcrypt, sessions are signed, every query is scoped to the
            signed-in user, and expensive endpoints are rate-limited. No system is perfectly
            secure, so use a unique password and sign out on shared devices.
          </p>
        </LegalSection>

        <LegalSection title="Your choices">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Edit your name or change your password in Settings.</li>
            <li>Delete individual interviews and mock sessions from the app.</li>
            <li>Export a debrief and transcript as Markdown from the debrief screen.</li>
            <li>Request a copy or deletion of your account data through the issue tracker.</li>
          </ul>
        </LegalSection>

        <LegalSection title="Children">
          <p>
            InterviewOS is intended for people aged 16 and over. Do not create an account if you
            are younger.
          </p>
        </LegalSection>

        <LegalSection title="Changes to this policy">
          <p>
            If this policy changes, the updated version will be posted here with a new date.
            Material changes will be communicated in the app where practical.
          </p>
        </LegalSection>

        <LegalSection title="Contact">
          <p>
            Questions about this policy or your data? Open an issue at{" "}
            <a
              href={ISSUES_URL}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-indigo-600 underline-offset-2 hover:text-indigo-500 hover:underline"
            >
              github.com/smoin7157-gif/interviewpilot/issues
            </a>
            .
          </p>
        </LegalSection>
      </LegalDocument>
    </>
  );
}
