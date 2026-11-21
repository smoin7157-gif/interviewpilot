export const COOKIE_CONSENT_STORAGE_KEY = "ip_cookie_consent_v1";
export const COOKIE_CONSENT_VERSION = 1;

export type CookieConsentCategories = {
  necessary: true;
  analytics: boolean;
};

export type CookieConsentRecord = CookieConsentCategories & {
  version: number;
  updatedAt: string;
};

export const DEFAULT_COOKIE_CONSENT: CookieConsentRecord = {
  version: COOKIE_CONSENT_VERSION,
  necessary: true,
  analytics: false,
  updatedAt: "",
};

export function parseCookieConsent(raw: string | null): CookieConsentRecord | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<CookieConsentRecord>;
    if (data.version !== COOKIE_CONSENT_VERSION) return null;
    if (data.necessary !== true) return null;
    return {
      version: COOKIE_CONSENT_VERSION,
      necessary: true,
      analytics: Boolean(data.analytics),
      updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : "",
    };
  } catch {
    return null;
  }
}

export function consentAllowsAnalytics(record: CookieConsentRecord | null): boolean {
  return Boolean(record?.analytics);
}

export function buildConsentRecord(analytics: boolean): CookieConsentRecord {
  return {
    version: COOKIE_CONSENT_VERSION,
    necessary: true,
    analytics,
    updatedAt: new Date().toISOString(),
  };
}