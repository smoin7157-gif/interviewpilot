import { claimSupportedInSource } from "./resume-grounding";
import { normalizeStableText } from "./stable-input-cache";
import type { DebriefContext, DebriefResult } from "./types";

/** Drop debrief evidence quotes that never appear in the session transcript. */
export function clampDebriefToTranscript(result: DebriefResult, ctx: DebriefContext): DebriefResult {
  const corpus = ctx.transcript.map((t) => normalizeStableText(t.text)).join("\n");
  if (!corpus.trim()) return result;
  return {
    ...result,
    breakdown: result.breakdown.map((b) => ({
      ...b,
      evidence:
        b.evidence && claimSupportedInSource(b.evidence, corpus)
          ? b.evidence.trim().slice(0, 240)
          : undefined,
    })),
  };
}