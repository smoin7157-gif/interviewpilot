"use client";

import Link from "next/link";
import { useCallback, useState, useSyncExternalStore } from "react";
import {
  buildConsentRecord,
  COOKIE_CONSENT_STORAGE_KEY,
  parseCookieConsent,
  type CookieConsentRecord,
} from "@/lib/cookie-consent";
import { Button } from "@/components/ui/button";

function readConsent(): CookieConsentRecord | null {
  if (typeof window === "undefined") return null;
  return parseCookieConsent(localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY));
}

function subscribeToConsent(onStoreChange: () => void) {
  const onChange = () => onStoreChange();
  window.addEventListener("ip:cookie-consent", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("ip:cookie-consent", onChange);
    window.removeEventListener("storage", onChange);
  };
}

function writeConsent(record: CookieConsentRecord) {
  localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(record));
  window.dispatchEvent(new CustomEvent("ip:cookie-consent", { detail: record }));
}

export function useCookieConsent(): CookieConsentRecord | null {
  return useSyncExternalStore(subscribeToConsent, readConsent, () => null);
}

export function CookieConsentBanner() {
  const consent = useCookieConsent();
  const [showCustomize, setShowCustomize] = useState(false);
  const [analyticsDraft, setAnalyticsDraft] = useState(false);

  const persist = useCallback((analytics: boolean) => {
    writeConsent(buildConsentRecord(analytics));
    setShowCustomize(false);
  }, []);

  if (consent) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
      className="fixed inset-x-0 bottom-0 z-[90] border-t border-zinc-200 bg-white/95 p-4 shadow-[0_-8px_30px_rgba(16,21,40,.12)] backdrop-blur-md sm:p-6"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <div>
          <h2 id="cookie-consent-title" className="text-base font-semibold text-zinc-900">
            Cookie choices
          </h2>
          <p id="cookie-consent-desc" className="mt-1 text-sm leading-relaxed text-zinc-600">
            InterviewOS uses essential cookies to keep you signed in. With your permission, we also load
            Google Analytics to understand how the public site is used. See our{" "}
            <Link href="/cookies" className="font-medium text-indigo-600 underline-offset-2 hover:underline">
              Cookie policy
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="font-medium text-indigo-600 underline-offset-2 hover:underline">
              Privacy policy
            </Link>
            .
          </p>
        </div>

        {showCustomize ? (
          <fieldset className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
            <legend className="px-1 text-sm font-semibold text-zinc-800">Customize</legend>
            <label className="mt-3 flex items-start gap-3 text-sm text-zinc-700">
              <input type="checkbox" checked disabled className="mt-1" />
              <span>
                <strong className="font-semibold text-zinc-900">Necessary</strong> — session cookie
                (always on).
              </span>
            </label>
            <label className="mt-3 flex items-start gap-3 text-sm text-zinc-700">
              <input
                type="checkbox"
                className="mt-1"
                checked={analyticsDraft}
                onChange={(e) => setAnalyticsDraft(e.target.checked)}
              />
              <span>
                <strong className="font-semibold text-zinc-900">Analytics</strong> — Google Analytics 4
                (optional).
              </span>
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" onClick={() => persist(analyticsDraft)}>
                Save choices
              </Button>
              <Button type="button" variant="ghost" onClick={() => persist(false)}>
                Reject all
              </Button>
            </div>
          </fieldset>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Button type="button" size="lg" className="w-full sm:w-auto" onClick={() => persist(true)}>
              Accept all
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => persist(false)}
            >
              Reject all
            </Button>
            <Button
              type="button"
              size="lg"
              variant="ghost"
              className="w-full sm:w-auto"
              onClick={() => {
                setAnalyticsDraft(false);
                setShowCustomize(true);
              }}
            >
              Customize
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function CookieSettingsTrigger({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
        window.dispatchEvent(new CustomEvent("ip:cookie-consent", { detail: null }));
        window.location.reload();
      }}
    >
      Cookie settings
    </button>
  );
}