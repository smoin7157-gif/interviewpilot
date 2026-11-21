import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { LegalDocument, LegalSection } from "@/components/legal-document";
import { LEGAL_ISSUES_URL, OPERATOR_DETAILS } from "@/lib/legal/constants";

export const metadata: Metadata = {
  title: "Contact & grievance",
  description:
    "Operator details, grievance officer contact placeholders, and how to reach InterviewOS for privacy requests.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact & grievance",
    description: "Business and grievance contacts for InterviewOS.",
    url: "/contact",
  },
};

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Contact & grievance"
        description="Operator details for India consumer and data-protection notices."
      />

      <LegalDocument updated="November 21, 2026">
        <LegalSection title="Operator">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong className="font-semibold text-zinc-800">Legal entity:</strong>{" "}
              {OPERATOR_DETAILS.legalEntity}
            </li>
            <li>
              <strong className="font-semibold text-zinc-800">Registered address:</strong>{" "}
              {OPERATOR_DETAILS.registeredAddress}
            </li>
            <li>
              <strong className="font-semibold text-zinc-800">Email:</strong>{" "}
              {OPERATOR_DETAILS.contactEmail}
            </li>
            <li>
              <strong className="font-semibold text-zinc-800">Phone:</strong>{" "}
              {OPERATOR_DETAILS.contactPhone}
            </li>
            <li>
              <strong className="font-semibold text-zinc-800">GSTIN:</strong> {OPERATOR_DETAILS.gstin}
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="Grievance officer (India)">
          <p>
            For grievances under applicable Indian digital personal data and e-commerce rules, contact:
          </p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>
              <strong className="font-semibold text-zinc-800">Name:</strong>{" "}
              {OPERATOR_DETAILS.grievanceOfficerName}
            </li>
            <li>
              <strong className="font-semibold text-zinc-800">Email:</strong>{" "}
              {OPERATOR_DETAILS.grievanceOfficerEmail}
            </li>
            <li>
              <strong className="font-semibold text-zinc-800">Response timeline:</strong>{" "}
              {OPERATOR_DETAILS.grievanceResponseDays} calendar days (founder to confirm).
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="Privacy and data requests">
          <p>
            Signed-in users can download or delete account data in{" "}
            <Link href="/settings" className="font-medium text-indigo-600 underline-offset-2 hover:underline">
              Settings
            </Link>
            . Without an account, email the grievance officer above or open a GitHub issue at{" "}
            <a
              href={LEGAL_ISSUES_URL}
              className="font-medium text-indigo-600 underline-offset-2 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              interviewpilot issues
            </a>{" "}
            with the address tied to your request.
          </p>
        </LegalSection>
      </LegalDocument>
    </>
  );
}