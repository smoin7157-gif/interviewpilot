import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const grotesk = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
});

const DESCRIPTION =
  "InterviewOS generates realistic, role-specific interview questions and gives you written practice with AI feedback on every answer — before the real interview.";

export const metadata: Metadata = {
  // Anchor for resolving relative OG/social URLs (from APP_URL when set, so
  // deployed environments share correct absolute links).
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: {
    default: "InterviewOS — Practice your interview before the real one.",
    template: "%s · InterviewOS",
  },
  description: DESCRIPTION,
  applicationName: "InterviewOS",
  openGraph: {
    type: "website",
    siteName: "InterviewOS",
    title: "InterviewOS — Practice your interview before the real one.",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "InterviewOS — Practice your interview before the real one.",
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${grotesk.variable} h-full antialiased`}>
      <body className="min-h-dvh">
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
