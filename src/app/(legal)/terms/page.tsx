import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { LegalDocument, LegalSection } from "@/components/legal-document";

export const metadata: Metadata = {
  title: "Terms of service",
  description:
    "The rules for using InterviewOS: accounts, acceptable use, AI-generated feedback, your content, and liability.",
  alternates: { canonical: "/terms" },
};

const ISSUES_URL = "https://github.com/smoin7157-gif/interviewpilot/issues";

export default function TermsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Terms of service"
        description="The rules for using InterviewOS, what the practice feedback does and does not promise, and how your content is handled."
      />

      <LegalDocument updated="November 9, 2026">
        <LegalSection title="Using InterviewOS">
          <p>
            By creating an account or using InterviewOS, you agree to these terms. If you do not
            agree, do not use the service.
          </p>
          <p>
            InterviewOS is an interview-practice tool. It is not an employer, recruiter, staffing
            agency, or career-placement service, and it is not affiliated with any company you name
            as a target.
          </p>
        </LegalSection>

        <LegalSection title="Your account">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>You must be at least 16 years old and provide accurate account information.</li>
            <li>
              Keep your password secure. You are responsible for activity that happens through your
              account.
            </li>
            <li>One person per account; do not share credentials.</li>
          </ul>
        </LegalSection>

        <LegalSection title="Practice content and AI output">
          <p>
            Questions, suggested answers, scores, follow-ups, and debriefs are generated
            automatically, sometimes by a third-party AI model, and can be wrong, incomplete, or
            generic. They are practice material and feedback &mdash; not professional career, legal,
            or employment advice &mdash; and they do not predict interview outcomes. Use your own
            judgement.
          </p>
        </LegalSection>

        <LegalSection title="Your content">
          <p>
            You keep ownership of the answers, resumes, projects, and other material you submit.
            You give the operator permission to store, process, and transmit that material only as
            needed to run the service &mdash; for example, sending text to the AI provider to
            generate questions or a debrief. Do not upload someone else&rsquo;s confidential
            material or content you have no right to use.
          </p>
        </LegalSection>

        <LegalSection title="Acceptable use">
          <p>Do not:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Use the service unlawfully or to harass, threaten, or discriminate against anyone.</li>
            <li>Attempt to access another person&rsquo;s account, data, or sessions.</li>
            <li>
              Probe, overload, or bypass security or rate limits, or scrape the service with
              automated tools.
            </li>
            <li>Upload malware or content that infringes someone else&rsquo;s rights.</li>
            <li>
              Resell or misrepresent the service, or present its output as a real
              employer&rsquo;s decision.
            </li>
          </ul>
          <p>
            The operator may suspend or remove access for behaviour that breaks these rules.
          </p>
        </LegalSection>

        <LegalSection title="Third-party services">
          <p>
            InterviewOS depends on hosting, a PostgreSQL database, GitHub&rsquo;s public API for
            optional profile data, and OpenRouter plus a language-model provider for AI features.
            Their availability and terms are outside the operator&rsquo;s control, and an AI
            feature may fall back to a built-in question bank when the live provider is
            unavailable.
          </p>
        </LegalSection>

        <LegalSection title="Availability and changes">
          <p>
            The service is provided as-is and may change, pause, or stop. Features, limits, and
            supported browsers can change without notice. The operator does not guarantee
            uninterrupted availability, that generated content is accurate, or that practice will
            improve a real interview result.
          </p>
        </LegalSection>

        <LegalSection title="Disclaimer and limitation of liability">
          <p>
            To the fullest extent permitted by law, the service is provided without warranties of
            any kind, and the operator is not liable for indirect, incidental, special, or
            consequential damages, or for lost opportunities, profits, or data arising from use of
            the service. Nothing in these terms limits rights that cannot be limited by law.
          </p>
        </LegalSection>

        <LegalSection title="Ending use">
          <p>
            You may stop using the service at any time and request deletion of your account. The
            operator may suspend or end access if these terms are broken or if running the service
            becomes impractical.
          </p>
        </LegalSection>

        <LegalSection title="Changes to these terms">
          <p>
            Updated terms will be posted here with a new date. Continuing to use the service after
            a change means you accept the updated terms.
          </p>
        </LegalSection>

        <LegalSection title="Contact">
          <p>
            Questions about these terms? Open an issue at{" "}
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
