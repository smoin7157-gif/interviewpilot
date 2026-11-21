import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import { GoogleAnalytics } from "@/components/google-analytics";
import { siteUrl } from "@/lib/env";
import { PUBLIC_ROBOTS, siteVerificationMetadata } from "@/lib/seo";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const grotesk = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const DESCRIPTION =
  "Practice realistic, role-specific interview questions with AI feedback and spoken mock interviews. Built for students and professionals preparing for their next role.";

export const viewport: Viewport = {
  // Matches the light app background so mobile browser chrome blends in.
  themeColor: "#fbfcfe",
  colorScheme: "light",
};

export const metadata: Metadata = {
  // Anchor for resolving relative OG/social URLs (from APP_URL when set, so
  // deployed environments share correct absolute links). `siteUrl` normalizes
  // it, so a scheme-less or malformed value can't throw at render time.
  metadataBase: new URL(siteUrl()),
  title: {
    default: "AI Interview Practice & Mock Interviews",
    template: "%s · InterviewOS",
  },
  description: DESCRIPTION,
  applicationName: "InterviewOS",
  robots: PUBLIC_ROBOTS,
  keywords: [
    "interview practice",
    "mock interview",
    "AI interview",
    "interview preparation",
    "voice mock interview",
    "job interview questions",
  ],
  ...siteVerificationMetadata(),
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "InterviewOS",
    title: "AI Interview Practice & Mock Interviews · InterviewOS",
    description: DESCRIPTION,
    url: siteUrl(),
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Interview Practice & Mock Interviews",
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${jakarta.variable} ${grotesk.variable} h-full antialiased`}>
      <body className="min-h-dvh">
        <GoogleAnalytics />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
