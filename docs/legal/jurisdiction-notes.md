# Jurisdiction notes — InterviewOS

Primary users: India (`en-IN` locale). Service may be accessed globally.

| Law / standard | How InterviewOS addresses it |
| --- | --- |
| **India DPDP Act 2023 + Rules 2025** | Privacy notice (`/privacy`), purpose-limited collection, consent on signup, grievance contact on `/contact`, erasure via account delete, children's section (18+ gate in terms) |
| **IT Act / SPDI Rules** | Reasonable security (bcrypt, scoped queries, rate limits), privacy policy disclosure |
| **Consumer Protection (E-Commerce) Rules** | Seller/operator details on `/contact` (founder TODOs); **no paid checkout** in this build |
| **CCPA dark patterns (guidance)** | Equal Accept/Reject on cookie banner, no pre-ticked marketing, no fake urgency on marketing pages |
| **ASCI** | No unproven superlatives on landing; practice scores labelled as practice-only in FAQ/terms |
| **RPwD / WCAG 2.2 AA** | Skip link, landmarks, focus styles, form labels — ongoing; run Lighthouse/axe before launch |
| **GDPR / UK GDPR (visitors)** | Analytics denied by default; explicit opt-in; export/delete in Settings |
| **CCPA/CPRA (California)** | No sale of data; deletion/export; no targeted ads |

## Age policy

Terms require users to be **18 or older**. Sign-up includes a consent attestation. Under-18 flows are not offered.

## Refund policy

Not applicable — free-to-use practice product without in-app payments.

## Lawyer review

Have counsel review `/privacy`, `/terms`, and `/cookies` before calling them final.