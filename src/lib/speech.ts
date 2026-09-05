/**
 * Browser speech pipeline for the AI Mock Interview (InterviewOS Phase 3).
 *
 * Providers are deliberately swappable: everything the live screen needs goes
 * through the tiny interfaces below, so a cloud STT/TTS provider could replace
 * the browser implementations without touching the interview UI. Today the
 * browser implementations need no API keys and store no audio server-side —
 * speech-to-text uses the browser's own speech service, TTS uses the OS voices,
 * and the camera is a local self-view only.
 *
 * Client-only module: never import this from a server component or route.
 */

export interface SttSession {
  /** Begin capturing speech. Safe to call once per answer. */
  start(): void;
  /** Stop capturing and discard partial audio. */
  stop(): void;
}

export interface SttHandlers {
  onInterim(text: string): void;
  /** A final, engine-confirmed transcript segment. */
  onFinal(text: string): void;
  /** The recognizer stopped (finished or was told to stop). */
  onEnd(): void;
  onError(code: string, message: string): void;
}

/* ---------------------------------- STT ---------------------------------- */

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: { error: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

function recognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Chrome/Edge only in practice — other engines don't ship a SpeechRecognition. */
export function browserSttSupported(): boolean {
  return recognitionCtor() !== null;
}

export function browserTtsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function normalizeEvent(
  event: unknown
): { interim: string; final: string } {
  let interim = "";
  let final = "";
  const ev = event as {
    resultIndex?: number;
    results?: ArrayLike<
      ArrayLike<{ transcript?: string }> & { isFinal?: boolean }
    >;
  };
  if (!ev.results) return { interim, final };
  for (let i = 0; i < ev.results.length; i++) {
    const result = ev.results[i];
    const transcript = result?.[0]?.transcript ?? "";
    if (result?.isFinal) final += transcript;
    else interim += transcript;
  }
  return { interim, final };
}

export function createBrowserStt(lang: string, handlers: SttHandlers): SttSession {
  const Ctor = recognitionCtor();
  if (!Ctor) {
    throw new Error("Speech recognition is not supported in this browser.");
  }
  const recognition = new Ctor();
  recognition.lang = lang;
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.onresult = (event: unknown) => {
    const { interim, final } = normalizeEvent(event);
    if (interim.trim()) handlers.onInterim(interim);
    if (final.trim()) handlers.onFinal(final);
  };
  recognition.onerror = (event: { error: string; message?: string }) => {
    handlers.onError(event.error, event.message ?? "");
  };
  recognition.onend = () => handlers.onEnd();
  return recognition;
}

/* ---------------------------------- TTS ---------------------------------- */

/** Speak a line through the browser's voice. Returns a cancel function. */
export function speak(
  text: string,
  opts: {
    rate?: number;
    onEnd?: () => void;
    onError?: (message: string) => void;
  } = {}
): () => void {
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickEnglishVoice();
  if (voice) utterance.voice = voice;
  utterance.rate = opts.rate ?? 1;
  utterance.pitch = 1;
  utterance.onend = () => opts.onEnd?.();
  utterance.onerror = (event) => {
    // 'interrupted'/'canceled' fire when the user navigates — not real failures.
    if (event.error === "interrupted" || event.error === "canceled") return;
    opts.onError?.(event.error || "Speech synthesis failed.");
  };
  synth.speak(utterance);
  return () => {
    synth.cancel();
  };
}

export function cancelSpeech(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

/** Chrome loads voices asynchronously — call once on the preflight screen. */
export function warmVoices(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}

export function pickEnglishVoice(): SpeechSynthesisVoice | null {
  const synth = window.speechSynthesis;
  const voices = synth.getVoices();
  if (voices.length === 0) return null;
  const preferred = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  const pool = preferred.length > 0 ? preferred : [...voices];
  // Prefer Google/online voices (more natural); fall back to the first English one.
  const natural =
    pool.find((v) => /google|natural|neural|premium/i.test(v.name)) ??
    pool.find((v) => v.lang.toLowerCase().startsWith("en")) ??
    pool[0];
  return natural ?? null;
}

/* --------------------------------- Media --------------------------------- */

export interface MediaCheckResult {
  audioGranted: boolean;
  videoGranted: boolean;
  audioError: string | null;
  videoError: string | null;
}

export async function requestMicrophone(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
}

export async function requestCamera(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ audio: false, video: true });
}

export function stopMediaStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

export function setTrackEnabled(
  stream: MediaStream | null,
  kind: "audio" | "video",
  enabled: boolean
): void {
  stream?.getTracks().forEach((track) => {
    if (track.kind === kind) track.enabled = enabled;
  });
}

/** Describe a getUserMedia failure for the UI (never raw error strings). */
export function describeMediaError(error: unknown): string {
  const name = error instanceof DOMException ? error.name : "";
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "Permission was denied. Allow microphone access in your browser and try again.";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "No microphone was found. Connect one and try again.";
    case "NotReadableError":
    case "TrackStartError":
      return "Your microphone is busy in another app. Close it and try again.";
    case "SecurityError":
      return "Microphone access requires a secure connection (HTTPS or localhost).";
    default:
      return "Couldn't access your microphone. Check your device settings and try again.";
  }
}
