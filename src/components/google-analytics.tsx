"use client";

import Script from "next/script";
import { useCookieConsent } from "@/components/cookie-consent";
import { consentAllowsAnalytics } from "@/lib/cookie-consent";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID?.trim();

/** Loads GA4 only in production, after explicit analytics consent (Google Consent Mode default denied). */
export function GoogleAnalytics() {
  const consent = useCookieConsent();

  if (!GA_ID) return null;
  if (process.env.NODE_ENV !== "production") return null;
  if (!consentAllowsAnalytics(consent)) return null;

  return (
    <>
      <Script id="ga4-consent" strategy="beforeInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('consent', 'default', {
            'analytics_storage': 'denied',
            'ad_storage': 'denied',
            'ad_user_data': 'denied',
            'ad_personalization': 'denied',
            'wait_for_update': 500
          });
          gtag('consent', 'update', { 'analytics_storage': 'granted' });
        `}
      </Script>
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