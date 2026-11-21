# InterviewOS — Feature series shoot brief

Short-form video series (4 episodes) demonstrating **interview practice** flows in this repo. Not an ATS, resume builder, or job-application product.

**Audience:** Students and professionals preparing for technical or role-specific interviews.  
**Tone:** Calm, confident, product-demo — show the UI, not hype.  
**Brand:** InterviewOS (indigo accent, light `#fbfcfe` background).  
**Runtime:** 45–75 seconds per episode; 9:16 and 16:9 masters from the same takes.

## Cast & account

- One demo account with 2–3 saved interviews (different roles).
- Use realistic but fictional role names (e.g. "Backend Engineer", "Product Manager").
- Resume optional; include one interview with a pasted job description for grounding shots.

## Recording environment

| Item | Notes |
| --- | --- |
| Browser | Chrome or Edge (required for voice mock B-roll) |
| Mic | Headset or USB mic for mock episode |
| Resolution | 1440×900 or 1920×1080 capture; crop for vertical |
| Audio | Voice-over recorded separately or live VO on final beat |
| Privacy | Blur or use dummy email on auth screens |

## Episode map

| # | Title | Hero promise | Primary route |
| --- | --- | --- | --- |
| 1 | **Role in, questions out** | Generate a tailored question set in one pass | `/interviews/new` → workspace |
| 2 | **Feedback that lands** | Every written answer gets a score and specifics | `/interviews/[id]` workspace |
| 3 | **Practice aloud** | Voice mock with follow-ups in the browser | `/mock/[id]` (from workspace) |
| 4 | **Your debrief, your history** | Six-dimension score + saved sessions | Mock end → `/history` |

Detailed beats: [feature-series/EPISODES.md](./feature-series/EPISODES.md)  
Shot list: [feature-series/SHOT_LIST.md](./feature-series/SHOT_LIST.md)  
Social captions: [public/feature-series-social-captions.txt](../../public/feature-series-social-captions.txt)

## On-screen rules

- Always show the **InterviewOS** wordmark in frame at least once per episode.
- Caption key phrases: "role-specific", "AI feedback", "voice mock", "six-dimension debrief".
- Never claim guaranteed job offers or ATS bypass.
- End card: `interviewos` home CTA — "Start practicing" → `/signup` (use `APP_URL` in production).

## Deliverables checklist

- [ ] 4× edited shorts (9:16)
- [ ] 4× landscape variants (16:9) if reusing for site hero
- [ ] Thumbnail set: role setup, score badge, mic icon, debrief radar/grid
- [ ] SRT or burned-in captions from `feature-series-social-captions.txt`

## Legal

Use only stock or self-recorded UI capture. No third-party job board logos in frame unless licensed.