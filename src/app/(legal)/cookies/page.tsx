import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { LegalDocument, LegalSection } from "@/components/legal-document";

export const metadata: Metadata = {
  title: "Cookie policy",
  description:
    "How InterviewOS uses cookies and local storage, including optional Google Analytics after your consent.",
  alternates: { canonical: "/cookies" },
  openGraph: {
    title: "Cookie policy",
    description: "Cookie and storage categories used by InterviewOS.",
    url: "/cookies",
  },
};

export default function CookiesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Cookie policy"
        description="What we store in your browser and how you can control optional analytics."
      />

      <LegalDocument updated="November 21, 2026">
        <LegalSection title="Overview">
          <p>
            InterviewOS uses a necessary session cookie and, only if you opt in, analytics cookies from
            Google Analytics 4. We do not use advertising or social-media pixels in this build.
          </p>
        </LegalSection>

        <LegalSection title="Cookie and storage table">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-sm text-zinc-700">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-zinc-900">
                  <th className="py-2 pr-4 font-semibold">Name</th>
                  <th className="py-2 pr-4 font-semibold">Provider</th>
                  <th className="py-2 pr-4 font-semibold">Purpose</th>
                  <th className="py-2 pr-4 font-semibold">Category</th>
                  <th className="py-2 font-semibold">Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-zinc-100 align-top">
                  <td className="py-3 pr-4 font-mono text-[13px]">ip_session</td>
                  <td className="py-3 pr-4">InterviewOS</td>
                  <td className="py-3 pr-4">Keeps you signed in (httpOnly session token).</td>
                  <td className="py-3 pr-4">Necessary</td>
                  <td className="py-3">Session</td>
                </tr>
                <tr className="border-b border-zinc-100 align-top">
                  <td className="py-3 pr-4 font-mono text-[13px]">ip_cookie_consent_v1</td>
                  <td className="py-3 pr-4">InterviewOS</td>
                  <td className="py-3 pr-4">Remembers your cookie choices (localStorage).</td>
                  <td className="py-3 pr-4">Necessary</td>
                  <td className="py-3">Until cleared</td>
                </tr>
                <tr className="align-top">
                  <td className="py-3 pr-4 font-mono text-[13px]">_ga, _ga_*</td>
                  <td className="py-3 pr-4">Google</td>
                  <td className="py-3 pr-4">Aggregated usage analytics (only after you accept).</td>
                  <td className="py-3 pr-4">Analytics</td>
                  <td className="py-3">Per Google policy</td>
                </tr>
              </tbody>
            </table>
          </div>
        </LegalSection>

        <LegalSection title="Your choices">
          <p>
            On your first visit, a banner lets you accept all, reject all, or customize analytics. You
            can reopen choices anytime using &ldquo;Cookie settings&rdquo; in the site footer.
          </p>
        </LegalSection>
      </LegalDocument>
    </>
  );
}