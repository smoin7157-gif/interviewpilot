# Data breach response checklist (operator)

1. **Contain** — rotate `AUTH_SECRET` if session forgery suspected; disable compromised API keys (OpenRouter, DB).
2. **Assess** — what data classes (accounts, resumes extracts, transcripts), how many users, likelihood of harm.
3. **Record** — timeline, systems touched, root cause hypothesis.
4. **Notify** — India DPDP / contractual obligations: inform affected users and the Data Protection Board when thresholds apply (legal counsel to decide).
5. **Remediate** — patch, redeploy, verify logs no longer leak sensitive fields.
6. **Document** — post-incident report; update `docs/legal/compliance-audit.md` if inventory changes.

Contact channel: grievance email on `/contact` once founder details are set.