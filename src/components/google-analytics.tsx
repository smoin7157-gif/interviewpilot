"use client";

import Script from "next/script";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID?.trim();

/**
 * Loads GA4 only when configured. Production should set NEXT_PUBLIC_GA_ID;
 * local dev stays free of analytics scripts.
 */
export function GoogleAnalytics() {
  if (!GA_ID) return null;
  if (process.env.NODE_ENV !== "production") return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { send_page_view: true });
        `}
      </Script>
    </>
  );
}