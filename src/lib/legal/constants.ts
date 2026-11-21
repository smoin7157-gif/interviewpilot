/** Bump when privacy or terms materially change (stored on signup consent). */
export const TERMS_POLICY_VERSION = "2026-11-21";

/** Founder-filled operating details — do not invent values. */
export const OPERATOR_DETAILS = {
  legalEntity: "TODO(founder): registered legal entity name",
  registeredAddress: "TODO(founder): registered business address",
  contactEmail: "TODO(founder): privacy@yourdomain.com",
  contactPhone: "TODO(founder): optional phone",
  gstin: "TODO(founder): GSTIN if registered",
  grievanceOfficerName: "TODO(founder): Grievance Officer full name",
  grievanceOfficerEmail: "TODO(founder): grievance@yourdomain.com",
  grievanceResponseDays: "TODO(founder): e.g. 30",
  governingLawCity: "TODO(founder): courts city for India governing law",
  dataRetentionDays: "TODO(founder): days before stale anonymous data is purged",
} as const;

export const LEGAL_ISSUES_URL = "https://github.com/smoin7157-gif/interviewpilot/issues";