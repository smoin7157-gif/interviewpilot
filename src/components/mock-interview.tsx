"use client";

/**
 * AI Mock Interview (InterviewOS Phase 3).
 *
 * Preflight → live spoken interview → completion. Voice runs fully in the
 * browser (getUserMedia + Web Speech API STT + speechSynthesis TTS) through
 * the replaceable speech module in src/lib/speech.ts — audio never leaves the
 * device. The AI interviewer itself lives server-side and returns one spoken
 * move at a time via /api/mock-interviews/:id/turn.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CameraOff,
  CheckCircle2,
  CircleCheckBig,
  CircleStop,
  Headphones,
  Keyboard,
  LoaderCircle,
  Mic,
  MicOff,
  MicVocal,
  MonitorSpeaker,
  RotateCcw,
  Send,
  Sparkles,
  Type,
  Volume2,
} from "lucide-react";
import {
  browserSttSupported,
  cancelSpeech,
  createBrowserStt,
  describeMediaError,
  requestCamera,
  requestMicrophone,
  setTrackEnabled,
  speak,
  stopMediaStream,
  warmVoices,
  type SttSession,
} from "@/lib/speech";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { DebriefView } from "@/components/debrief-view";
import { DebriefExport } from "@/components/debrief-export";
import type { DebriefData } from "@/lib/types";

type Stage = "preflight" | "starting" | "live" | "done";

type LivePhase =
  | "ai_speaking" // AI text is being spoken
  | "listening" // STT is capturing
  | "typing" // typed-answer box is visible (voice off / mic issue / no speech)
  | "thinking" // answer sent, waiting on the interviewer
  | "input_needed" // no speech heard / mic blocked — offer retry or typing
  | "error";

interface TranscriptLine {
  speaker: "AI" | "You";
  text: string;
}

interface TurnResponse {
  action: string;
  text: string;
  category?: string | null;
  difficulty?: string | null;
  reason?: string | null;
  questionNumber: number;
  maxQuestions: number;
  completed: boolean;
  error?: string;
}

interface MockDetail {
  id: string;
  status: string;
  maxQuestions: number;
  questionsAsked: number;
  /** ISO timestamp; present on the GET detail response, used to date exports. */
  startedAt?: string;
  turns: Array<{ speaker: string; text: string; action?: string | null; category?: string | null; difficulty?: string | null }>;
}

const STT_LANG = "en-US";

/** Stable no-op subscription for the browser-capability snapshot. */
const subscribeToNothing = () => () => {};

function formatCategory(value?: string | null): string {
  if (!value) return "Question";
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function MockInterview({
  interviewId,
  role,
  company,
  seniority,
  interviewType,
  companyType,
  questionCount,
  targetCount,
}: {
  interviewId: string;
  role: string;
  company: string | null;
  seniority: string;
  interviewType: string | null;
  companyType: string | null;
  questionCount: number;
  targetCount: number;
}) {
  /* ------------------------------ state ------------------------------ */
  const [stage, setStage] = useState<Stage>("preflight");
  const [micError, setMicError] = useState<string | null>(null);
  const [camNote, setCamNote] = useState<string | null>(null);
  const [wantCamera, setWantCamera] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [muted, setMuted] = useState(false);
  const [hasCam, setHasCam] = useState(false);

  const [phase, setPhase] = useState<LivePhase>("ai_speaking");
  const [liveError, setLiveError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);
  const [interim, setInterim] = useState("");
  const [typedAnswer, setTypedAnswer] = useState("");
  const interimRef = useRef("");
  const [inputMessage, setInputMessage] = useState<string | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [maxQuestions, setMaxQuestions] = useState(Math.min(targetCount || 10, questionCount));
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [doneSummary, setDoneSummary] = useState<MockDetail | null>(null);
  const [debrief, setDebrief] = useState<DebriefData | null>(null);
  const [debriefLoading, setDebriefLoading] = useState(false);
  const [debriefError, setDebriefError] = useState<string | null>(null);
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  // Server/hydration snapshot is `false`; the client snapshot reflects the
  // real browser, so the preflight UI adapts without a hydration mismatch.
  const sttSupported = useSyncExternalStore(subscribeToNothing, browserSttSupported, () => false);

  /* ------------------------------ refs ------------------------------ */
  const mockIdRef = useRef<string | null>(null);
  const voiceRef = useRef(true); // STT available + mic granted
  const mutedRef = useRef(false); // mirror of `muted` so STT callbacks never read stale state
  const sttRef = useRef<SttSession | null>(null);
  const cancelSpeakRef = useRef<(() => void) | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const camStreamRef = useRef<MediaStream | null>(null);
  const camVideoRef = useRef<HTMLVideoElement | null>(null);
  const busyRef = useRef(false);
  const finishingRef = useRef(false);
  const startingRef = useRef(false);
  const debriefRef = useRef(false);
  const aliveRef = useRef(true);
  const listenCycleRef = useRef(0);
  const answeredRef = useRef(false);

  useEffect(() => {
    aliveRef.current = true;
    warmVoices();
    return () => {
      aliveRef.current = false;
      cancelSpeech();
      sttRef.current?.stop();
      stopMediaStream(micStreamRef.current);
      stopMediaStream(camStreamRef.current);
    };
  }, []);

  /* ---------------------------- helpers ----------------------------- */

  function appendLine(line: TranscriptLine) {
    setLines((prev) => [...prev.slice(-40), line]);
  }

  function stopEverything() {
    sttRef.current?.stop();
    sttRef.current = null;
    cancelSpeakRef.current?.();
    cancelSpeakRef.current = null;
    setInterim("");
    setInputMessage(null);
  }

  function bindVideo(stream: MediaStream | null) {
    const video = camVideoRef.current;
    if (!video) return;
    if (stream) {
      video.srcObject = stream;
      void video.play().catch(() => undefined);
    } else {
      video.srcObject = null;
    }
  }

  // Re-attach the stream whenever the self-view element (re)mounts.
  useEffect(() => {
    if (cameraOn && hasCam && camStreamRef.current) bindVideo(camStreamRef.current);
  }, [cameraOn, hasCam]);

  /* --------------------------- listen loop --------------------------- */

  function listen() {
    if (!aliveRef.current || busyRef.current) return;
    if (!voiceRef.current) {
      setPhase("typing");
      return;
    }
    if (mutedRef.current) {
      setInputMessage("Microphone is muted. Unmute to speak.");
      setPhase("input_needed");
      return;
    }
    setLiveError(null);
    setInputMessage(null);
    setInterim("");
    interimRef.current = "";
    setPhase("listening");
    const cycle = ++listenCycleRef.current;
    answeredRef.current = false;

    let session: SttSession;
    try {
      session = createBrowserStt(STT_LANG, {
        onInterim: (text) => {
          interimRef.current = text;
          if (cycle === listenCycleRef.current) setInterim(text);
        },
        onFinal: (text) => {
          if (cycle !== listenCycleRef.current || answeredRef.current) return;
          if (!text.trim()) return;
          answeredRef.current = true;
          stopEverything();
          void submitAnswer(text);
        },
        onError: (code) => {
          if (cycle !== listenCycleRef.current) return;
          if (code === "aborted") return;
          if (code === "not-allowed" || code === "service-not-allowed") {
            voiceRef.current = false;
            setInputMessage("Speech recognition isn't permitted — you can type your answers instead.");
            setPhase("typing");
          } else if (code === "no-speech") {
            setInputMessage("I didn't hear anything. Try again or type your answer.");
            setPhase("input_needed");
          } else if (code === "audio-capture") {
            setInputMessage("Your microphone isn't sending audio. Check it and try again, or type instead.");
            setPhase("input_needed");
          } else {
            setInputMessage("Speech recognition hit an error — try again or type your answer.");
            setPhase("input_needed");
          }
        },
        onEnd: () => {
          if (cycle !== listenCycleRef.current) return;
          // Reached after silence (no final) or after manual stop.
          if (answeredRef.current) return;
          if (mutedRef.current) {
            setInputMessage("Microphone is muted. Unmute to speak.");
            setPhase("input_needed");
          } else {
            setInputMessage("I didn't catch that — try again or type your answer.");
            setPhase("input_needed");
          }
        },
      });
      sttRef.current = session;
      session.start();
    } catch {
      voiceRef.current = false;
      setInputMessage("Voice capture isn't available here — you can type your answers instead.");
      setPhase("typing");
    }
  }

  /* ------------------------- turn submission ------------------------- */

  function speakAi(text: string, onDone?: () => void) {
    setCurrentQuestion(text);
    setPhase("ai_speaking");
    cancelSpeakRef.current = speak(text, {
      onEnd: () => {
        cancelSpeakRef.current = null;
        if (aliveRef.current && onDone) onDone();
      },
      onError: () => {
        cancelSpeakRef.current = null;
        if (aliveRef.current && onDone) onDone();
      },
    });
  }

  async function submitAnswer(transcript: string) {
    if (busyRef.current || !mockIdRef.current || !aliveRef.current) return;
    const clean = transcript.trim();
    if (clean.length === 0) return;
    busyRef.current = true;
    answeredRef.current = true;
    appendLine({ speaker: "You", text: clean });
    setPhase("thinking");
    setLiveError(null);
    try {
      const res = await fetch(`/api/mock-interviews/${mockIdRef.current}/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: clean }),
      });
      const data = (await res.json()) as TurnResponse;
      if (!res.ok) throw new Error(data.error ?? "The interviewer couldn't respond. Please retry.");
      setCurrentCategory(data.completed ? null : (data.category ?? null));
      if (data.completed) {
        setQuestionNumber(data.questionNumber ?? 0);
        appendLine({ speaker: "AI", text: data.text });
        speakAi(data.text, () => finishInterview("ai"));
        return;
      }
      setQuestionNumber(data.questionNumber);
      appendLine({ speaker: "AI", text: data.text });
      speakAi(data.text, () => {
        busyRef.current = false;
        listen();
      });
    } catch (err) {
      setLiveError(err instanceof Error ? err.message : "Couldn't reach the interviewer.");
      setPhase("error");
      busyRef.current = false;
    }
  }

  async function openInterview() {
    busyRef.current = true;
    setPhase("thinking");
    setLiveError(null);
    try {
      const res = await fetch(`/api/mock-interviews/${mockIdRef.current}/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: "" }),
      });
      const data = (await res.json()) as TurnResponse;
      if (!res.ok) throw new Error(data.error ?? "The interviewer couldn't start. Please retry.");
      if (data.completed) {
        // Interviewer ended immediately (no questions ready) — surface honestly.
        busyRef.current = false;
        finishInterview("ai");
        return;
      }
      setMaxQuestions(data.maxQuestions || maxQuestions);
      setQuestionNumber(data.questionNumber);
      setCurrentCategory(data.category ?? null);
      appendLine({ speaker: "AI", text: data.text });
      speakAi(data.text, () => {
        busyRef.current = false;
        listen();
      });
    } catch (err) {
      setLiveError(err instanceof Error ? err.message : "Couldn't start the interview.");
      setPhase("error");
      busyRef.current = false;
    }
  }

  /* ------------------------- resume a session ------------------------- */

  async function resumeFromDetail(detail: MockDetail) {
    const lastAi = [...detail.turns].reverse().find((t) => t.speaker === "AI");
    setMaxQuestions(detail.maxQuestions || maxQuestions);
    setQuestionNumber(Math.max(1, detail.questionsAsked));
    setCurrentCategory(lastAi?.category ?? null);
    setLines(
      detail.turns.map((t) => ({
        speaker: t.speaker === "AI" ? "AI" : "You",
        text: t.text,
      }))
    );
    if (lastAi) {
      setCurrentQuestion(lastAi.text);
      setPhase("ai_speaking");
      speakAi(lastAi.text, () => {
        busyRef.current = false;
        listen();
      });
    } else {
      // Opened but no question stored yet — start fresh.
      await openInterview();
    }
  }

  /* --------------------------- start (preflight) --------------------------- */

  async function handleStart(typingOnly = false) {
    if (startingRef.current) return;
    startingRef.current = true;
    setMicError(null);
    setCamNote(null);
    setDebrief(null);
    setDebriefError(null);
    setDebriefLoading(false);
    setStage("starting");

    // Voice mode needs the Web Speech API. When it's missing — or the user
    // explicitly chose to type after a mic failure — skip the microphone
    // entirely instead of blocking on a permission the browser can't use.
    const sttOk = !typingOnly && browserSttSupported();

    // 1) Microphone is required only for a voice interview.
    if (sttOk) {
      try {
        micStreamRef.current = await requestMicrophone();
        setTrackEnabled(micStreamRef.current, "audio", true);
      } catch (err) {
        const message = describeMediaError(err);
        setMicError(message);
        setStage("preflight");
        startingRef.current = false;
        return;
      }
    }

    // 2) Camera is optional — continue voice-only when unavailable.
    if (wantCamera && !typingOnly) {
      try {
        camStreamRef.current = await requestCamera();
        setCameraOn(true);
        setHasCam(true);
        setTimeout(() => bindVideo(camStreamRef.current), 0);
      } catch {
        camStreamRef.current = null;
        setCameraOn(false);
        setHasCam(false);
        setWantCamera(false);
        setCamNote("Camera unavailable — continuing with voice only. Your camera is never required.");
      }
    }

    voiceRef.current = sttOk;
    if (!sttOk) {
      setInputMessage(
        typingOnly
          ? "Continuing without voice — type your answers below."
          : "Voice recognition isn't supported in this browser. Type your answers below — everything else works the same."
      );
      setPhase("typing");
    }

    try {
      const res = await fetch("/api/mock-interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interviewSessionId: interviewId }),
      });
      const data = (await res.json()) as {
        mockSessionId?: string;
        resumed?: boolean;
        maxQuestions?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Couldn't start the mock interview.");
      mockIdRef.current = data.mockSessionId ?? null;
      if (data.maxQuestions) setMaxQuestions(data.maxQuestions);

      setStage("live");
      if (data.resumed && mockIdRef.current) {
        const detailRes = await fetch(`/api/mock-interviews/${mockIdRef.current}`);
        if (detailRes.ok) {
          const detail = (await detailRes.json()) as MockDetail;
          if (detail.turns.some((t) => t.speaker === "AI")) {
            await resumeFromDetail(detail);
            return;
          }
        }
      }
      await openInterview();
    } catch (err) {
      setLiveError(err instanceof Error ? err.message : "Couldn't start the interview.");
      setPhase("error");
      setStage("live");
    }
  }

  /* ------------------------------ debrief ------------------------------ */

  async function fetchDebrief(force = false) {
    if (!mockIdRef.current || !aliveRef.current) return;
    if (debriefRef.current) return;
    debriefRef.current = true;
    setDebriefLoading(true);
    setDebriefError(null);
    try {
      const res = await fetch(`/api/mock-interviews/${mockIdRef.current}/debrief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const data = (await res.json()) as { debrief?: DebriefData; error?: string };
      if (!res.ok) {
        setDebriefError(data.error ?? "We couldn't prepare your debrief.");
        return;
      }
      if (data.debrief) setDebrief(data.debrief);
    } catch {
      setDebriefError("We couldn't prepare your debrief.");
    } finally {
      debriefRef.current = false;
      setDebriefLoading(false);
    }
  }

  /* ------------------------------ finishing ------------------------------ */

  async function finishInterview(reason: "ai" | "user") {
    if (!aliveRef.current || finishingRef.current) return;
    finishingRef.current = true;
    stopEverything();
    cancelSpeech();
    if (mockIdRef.current && reason === "user") {
      try {
        await fetch(`/api/mock-interviews/${mockIdRef.current}/end`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        });
      } catch {
        // completion view still works from local state
      }
    }
    try {
      if (mockIdRef.current) {
        const res = await fetch(`/api/mock-interviews/${mockIdRef.current}`);
        if (res.ok) setDoneSummary((await res.json()) as MockDetail);
      }
    } catch {
      // ignore
    }
    // Fully release the devices — a disabled track keeps the browser's
    // recording indicator (and the mic) alive on the completion screen.
    stopMediaStream(micStreamRef.current);
    stopMediaStream(camStreamRef.current);
    micStreamRef.current = null;
    camStreamRef.current = null;
    setStage("done");
    setPhase("ai_speaking");
    void fetchDebrief();
  }

  function handleEnd() {
    if (finishingRef.current) return;
    setEndConfirmOpen(true);
  }

  async function confirmEnd() {
    if (ending) return;
    setEnding(true);
    try {
      await finishInterview("user");
    } finally {
      setEnding(false);
    }
  }

  /* --------------------------- live controls --------------------------- */

  function toggleMute() {
    if (busyRef.current) return;
    if (muted) {
      setMuted(false);
      mutedRef.current = false;
      setInputMessage(null);
      listen();
    } else {
      setMuted(true);
      mutedRef.current = true;
      stopEverything();
      setInputMessage("Microphone muted. Unmute to speak, or type your answer.");
      setPhase("input_needed");
    }
  }

  function toggleCamera() {
    if (!camStreamRef.current) return;
    const next = !cameraOn;
    setCameraOn(next);
    setTrackEnabled(camStreamRef.current, "video", next);
    if (next) {
      bindVideo(camStreamRef.current);
    }
  }

  function retryTurn() {
    if (typedAnswer.trim()) {
      const text = typedAnswer.trim();
      setTypedAnswer("");
      void submitAnswer(text);
    } else {
      listen();
    }
  }

  function sendTyped() {
    const text = typedAnswer.trim();
    if (!text) return;
    setTypedAnswer("");
    void submitAnswer(text);
  }

  /* ------------------------------ rendering ------------------------------ */

  const backHref = `/interviews/${interviewId}`;

  if (stage === "done") {
    const asked = doneSummary?.questionsAsked ?? lines.filter((l) => l.speaker === "AI").length;
    return (
      <div className="flex h-full items-start justify-center overflow-y-auto px-4 py-10 sm:px-6">
        <div className="w-full max-w-2xl">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl sm:p-8">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="size-9 text-emerald-400" aria-hidden />
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-white">Mock interview complete</h1>
                <p className="text-sm text-zinc-400">
                  {role}
                  {company ? ` at ${company}` : ""} · {seniority}
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center">
                <p className="font-display text-2xl font-bold text-white">{asked}</p>
                <p className="mt-0.5 text-xs uppercase tracking-wide text-zinc-500">Questions asked</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center">
                <p className="font-display text-2xl font-bold text-white">{doneSummary?.maxQuestions ?? maxQuestions}</p>
                <p className="mt-0.5 text-xs uppercase tracking-wide text-zinc-500">Planned length</p>
              </div>
              <div className="col-span-2 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center sm:col-span-1">
                <p className="text-2xl font-bold text-white">✓</p>
                <p className="mt-0.5 text-xs uppercase tracking-wide text-zinc-500">Saved to history</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
              <a
                href={`/mock/${interviewId}`}
                className={cn(buttonClasses({ className: "flex-1 justify-center bg-indigo-600 text-white hover:bg-indigo-500" }))}
              >
                <RotateCcw className="size-4" aria-hidden /> New mock interview
              </a>
              <Link
                href={backHref}
                className={cn(buttonClasses({ variant: "outline", className: "flex-1 justify-center" }))}
              >
                Back to practice
              </Link>
            </div>

            {/* Debrief — auto-generated from the stored transcript */}
            <div className="mt-6" aria-live="polite">
              {debriefLoading ? (
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5 py-6 text-sm text-zinc-400">
                  <LoaderCircle className="size-4 animate-spin text-indigo-400" aria-hidden />
                  Preparing your debrief…
                </div>
              ) : debrief ? (
                <>
                  <DebriefView debrief={debrief} tone="dark" />
                  <DebriefExport
                    debrief={debrief}
                    meta={{ role, company, seniority, interviewType, createdAt: doneSummary?.startedAt }}
                    turns={(doneSummary?.turns ?? []).map((turn) => ({ speaker: turn.speaker, text: turn.text }))}
                    tone="dark"
                    className="mt-4"
                  />
                  <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
                    {doneSummary?.id ? (
                      <Link
                        href={`/history/${doneSummary.id}`}
                        className={cn(buttonClasses({ variant: "outline", className: "flex-1 justify-center" }))}
                      >
                        <Sparkles className="size-4" aria-hidden /> View full debrief
                      </Link>
                    ) : null}
                    <Link
                      href="/history"
                      className={cn(buttonClasses({ variant: "outline", className: "flex-1 justify-center" }))}
                    >
                      Mock History
                    </Link>
                  </div>
                </>
              ) : debriefError ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5 py-4">
                  <p className="text-sm leading-relaxed text-zinc-300">{debriefError}</p>
                  {!debriefError.includes("Answer at least") && (
                    <button
                      type="button"
                      onClick={() => void fetchDebrief()}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-100 transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      <RotateCcw className="size-3.5" aria-hidden /> Try again
                    </button>
                  )}
                </div>
              ) : null}
            </div>

            {(doneSummary?.turns.length ?? 0) > 0 && (
              <details className="mt-6 group">
                <summary className="cursor-pointer select-none text-sm font-medium text-zinc-300 hover:text-white">
                  View your transcript
                </summary>
                <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
                  {(doneSummary?.turns ?? []).map((turn, i) => (
                    <div
                      key={i}
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm leading-relaxed",
                        turn.speaker === "AI"
                          ? "border border-zinc-800 bg-zinc-950 text-zinc-200"
                          : "bg-indigo-950/40 text-indigo-100"
                      )}
                    >
                      <span className="mr-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        {turn.speaker === "AI" ? "Interviewer" : "You"}
                      </span>
                      {turn.text}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------ live screen ------------------------------ */

  if (stage === "live") {
    const busy = phase === "thinking";
    const thinking = busy;
    const showTypingBox = phase === "typing" || (phase === "input_needed" && inputMessage?.includes("type"));
    return (
      <div className="flex h-full flex-col">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="size-4" aria-hidden /> Exit
            </Link>
            <span className="hidden h-4 w-px bg-zinc-800 sm:block" aria-hidden />
            <p className="hidden truncate text-sm text-zinc-400 sm:block">
              {role}
              {company ? ` · ${company}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs font-medium tabular-nums text-zinc-300">
              {Math.max(1, questionNumber)} / {maxQuestions}
            </span>
            <button
              type="button"
              onClick={() => void handleEnd()}
              className="inline-flex items-center gap-1.5 rounded-full border border-red-900/60 bg-red-950/40 px-3 py-1.5 text-xs font-semibold text-red-300 transition-colors hover:bg-red-900/50 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <CircleStop className="size-4" aria-hidden /> End
            </button>
          </div>
        </header>

        {/* Stage */}
        <main className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-4 py-6 sm:px-6">
          <div className="flex w-full max-w-2xl flex-1 flex-col">
            {/* AI interviewer bubble */}
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-950/50">
                <Sparkles className="size-6 text-white" aria-hidden />
              </div>
              <p
                aria-live="polite"
                className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300"
              >
                {thinking ? "Interviewer is thinking…" : phase === "listening" ? "Your turn" : "AI Interviewer"}
              </p>

              {currentQuestion ? (
                <blockquote className="mt-4 max-w-2xl text-xl font-medium leading-relaxed tracking-tight text-white sm:text-2xl">
                  “{currentQuestion}”
                </blockquote>
              ) : (
                <p className="mt-4 text-lg text-zinc-400">Preparing your interview…</p>
              )}

              {currentCategory && phase !== "thinking" && phase !== "ai_speaking" && (
                <div className="mt-4 flex items-center gap-2">
                  <Badge tone="indigo">{formatCategory(currentCategory)}</Badge>
                </div>
              )}
            </div>

            {/* Camera self-view (private, never transmitted) */}
            {hasCam && cameraOn && (
              <div className="relative mx-auto mt-2 h-32 w-44 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
                <video ref={camVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
                <span className="absolute bottom-1.5 left-2 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                  You · private view
                </span>
              </div>
            )}

            {/* Listening / interim / typing / messages */}
            <div className="mt-6 min-h-28">
              {phase === "listening" && (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex size-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                      <span className="relative inline-flex size-3 rounded-full bg-emerald-400" />
                    </span>
                    <span className="text-sm font-medium text-emerald-300">Listening…</span>
                    <MicVocal className="size-4 text-emerald-300" aria-hidden />
                  </div>
                  {interim && (
                    <p className="max-w-lg text-center text-[15px] italic leading-relaxed text-zinc-300">
                      “{interim}”
                    </p>
                  )}
                  <p className="text-xs text-zinc-500">Speak your answer, then pause — or tap “Done”.</p>
                </div>
              )}

              {phase === "ai_speaking" && (
                <div className="flex items-center justify-center gap-2 text-sm text-zinc-400">
                  <Volume2 className="size-4 animate-pulse text-indigo-400" aria-hidden />
                  Interviewer speaking…
                </div>
              )}

              {phase === "thinking" && (
                <div className="flex items-center justify-center gap-2 text-sm text-zinc-400">
                  <LoaderCircle className="size-4 animate-spin text-indigo-400" aria-hidden />
                  Listening to your answer…
                </div>
              )}

              {phase === "input_needed" && inputMessage && (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-amber-900/50 bg-amber-950/20 px-5 py-4 text-center">
                  <p className="flex items-center gap-2 text-sm text-amber-200">
                    <AlertTriangle className="size-4 shrink-0" aria-hidden /> {inputMessage}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {!muted && (
                      <button
                        type="button"
                        onClick={() => {
                          setInputMessage(null);
                          listen();
                        }}
                        className={cn(buttonClasses({ size: "sm", className: "bg-indigo-600 text-white hover:bg-indigo-500" }))}
                      >
                        <Mic className="size-4" aria-hidden /> Try speaking again
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setInputMessage(null);
                        setPhase("typing");
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-[13px] font-semibold text-zinc-100 transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      <Keyboard className="size-4" aria-hidden /> Type answer
                    </button>
                  </div>
                </div>
              )}

              {showTypingBox && (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
                  <textarea
                    value={typedAnswer}
                    onChange={(e) => setTypedAnswer(e.target.value)}
                    rows={3}
                    placeholder="Type your answer, then send…"
                    aria-label="Your typed answer"
                    className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-[15px] leading-relaxed text-white placeholder-zinc-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40"
                  />
                  <div className="mt-2 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={sendTyped}
                      disabled={typedAnswer.trim().length === 0 || busy}
                      className={cn(
                        buttonClasses({ size: "sm", className: "bg-indigo-600 text-white hover:bg-indigo-500" }),
                        (typedAnswer.trim().length === 0 || busy) && "cursor-not-allowed opacity-50"
                      )}
                    >
                      Send answer <Send className="size-4" aria-hidden />
                    </button>
                  </div>
                </div>
              )}

              {phase === "error" && liveError && (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-900/60 bg-red-950/30 px-5 py-4 text-center">
                  <p className="text-sm text-red-200">{liveError}</p>
                  <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={retryTurn}
                  className={cn(buttonClasses({ size: "sm" }))}
                >
                  <RotateCcw className="size-4" aria-hidden /> Try again
                </button>
                    <button
                      type="button"
                      onClick={() => setPhase("typing")}
                      className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-[13px] font-semibold text-zinc-100 transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      <Type className="size-4" aria-hidden /> Type instead
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleEnd()}
                      className="inline-flex items-center gap-2 rounded-full border border-red-900/60 bg-red-950/40 px-4 py-2 text-[13px] font-semibold text-red-200 transition-colors hover:bg-red-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                    >
                      End interview
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={toggleMute}
                disabled={busy}
                title={muted ? "Unmute microphone" : "Mute microphone"}
                aria-label={muted ? "Unmute microphone" : "Mute microphone"}
                className={cn(
                  "flex size-11 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-40",
                  muted
                    ? "border-red-900/60 bg-red-950/50 text-red-300 hover:bg-red-900/40"
                    : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                )}
              >
                {muted ? <MicOff className="size-5" aria-hidden /> : <Mic className="size-5" aria-hidden />}
              </button>

              {hasCam && (
                <button
                  type="button"
                  onClick={toggleCamera}
                  disabled={busy}
                  title={cameraOn ? "Turn camera off" : "Turn camera on"}
                  aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
                  className={cn(
                    "flex size-11 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-40",
                    cameraOn
                      ? "border-indigo-700/60 bg-indigo-950/50 text-indigo-300 hover:bg-indigo-900/40"
                      : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
                  )}
                >
                  {cameraOn ? <Camera className="size-5" aria-hidden /> : <CameraOff className="size-5" aria-hidden />}
                </button>
              )}

              {phase === "listening" && !muted && (
                <button
                  type="button"
                  onClick={() => {
                    const partial = interimRef.current.trim();
                    stopEverything();
                    if (partial.length > 0) {
                      void submitAnswer(partial);
                    } else {
                      setInputMessage(null);
                      setPhase("input_needed");
                    }
                  }}
                  className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <CircleCheckBig className="size-4" aria-hidden /> Done
                </button>
              )}
            </div>
          </div>
        </main>

        <ConfirmDialog
          open={endConfirmOpen}
          onClose={() => {
            if (ending) return;
            setEndConfirmOpen(false);
          }}
          onConfirm={confirmEnd}
          tone="dark"
          title="End this mock interview?"
          description="Your transcript and progress are saved, and you'll get a debrief."
          confirmLabel="End interview"
          loading={ending}
        />
      </div>
    );
  }

  /* ------------------------------ preflight ------------------------------ */

  const starting = stage === "starting";
  return (
    <div className="flex h-full items-start justify-center overflow-y-auto px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-2xl">
        <header className="mb-6 flex items-center justify-between">
          <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white">
            <ArrowLeft className="size-4" aria-hidden /> Back
          </Link>
          <p className="text-xs text-zinc-500">
            Interview<span className="text-indigo-400">OS</span> · AI Mock Interview
          </p>
        </header>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl sm:p-8">
          <div className="flex items-center gap-2">
            <MonitorSpeaker className="size-5 text-indigo-400" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">AI Mock Interview</span>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Practice aloud with an AI interviewer.
          </h1>            <p className="mt-2 text-[15px] leading-relaxed text-zinc-400">
              You&rsquo;ll answer spoken questions and get live follow-ups — just like the real thing.
              Your microphone is used only to transcribe your spoken answers in your browser; transcripts are
              saved to your session, but audio is never recorded. The camera, if you turn it on, is a private
              self-view and is never sent anywhere.
            </p>

          {/* Context summary */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Role", value: role },
              { label: "Company", value: company ?? "Not specified" },
              { label: "Level", value: seniority },
              { label: "Type", value: interviewType ?? companyType ?? "General" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{item.label}</p>
                <p className="mt-0.5 truncate text-sm font-medium text-zinc-100" title={item.value}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {/* Device checks */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
              <div className="flex items-center gap-3">
                <Mic
                  className={cn("size-5", sttSupported === false ? "text-amber-400" : "text-emerald-400")}
                  aria-hidden
                />
                <div>
                  <p className="text-sm font-medium text-zinc-100">Microphone</p>
                  <p className="text-xs text-zinc-500">
                    {sttSupported === false
                      ? "Not needed — you'll type your answers"
                      : "Required — hears your spoken answers"}
                  </p>
                </div>
              </div>
              <Badge tone={sttSupported === false ? "amber" : "green"}>
                {sttSupported === false ? "Typing mode" : "Needed"}
              </Badge>
            </div>

            <button
              type="button"
              role="checkbox"
              aria-checked={wantCamera}
              onClick={() => setWantCamera((v) => !v)}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                wantCamera
                  ? "border-indigo-700/60 bg-indigo-950/40"
                  : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
              )}
            >
              <div className="flex items-center gap-3">
                {wantCamera ? (
                  <Camera className="size-5 text-indigo-400" aria-hidden />
                ) : (
                  <CameraOff className="size-5 text-zinc-500" aria-hidden />
                )}
                <div>
                  <p className="text-sm font-medium text-zinc-100">Camera self-view</p>
                  <p className="text-xs text-zinc-500">Optional — private preview, never transmitted</p>
                </div>
              </div>
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full border",
                  wantCamera ? "border-indigo-500 bg-indigo-600 text-white" : "border-zinc-700"
                )}
                aria-hidden
              >
                {wantCamera && <CheckCircle2 className="size-3.5" />}
              </span>
            </button>

            <div className="flex items-start gap-2 rounded-xl border border-zinc-800/70 bg-zinc-950/60 px-4 py-3 text-xs leading-relaxed text-zinc-500">
              <Headphones className="mt-0.5 size-4 shrink-0 text-zinc-600" aria-hidden />
              <p>
                Find a quiet spot and use headphones for the clearest practice. Voice recognition works best in
                Chrome or Edge on this page.
              </p>
            </div>
          </div>

          {micError && (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-900/60 bg-red-950/30 px-4 py-3">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-400" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-red-200">We couldn&rsquo;t reach your microphone.</p>
                <p className="mt-1 text-sm leading-relaxed text-red-300/80">{micError}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleStart()}
                    className="inline-flex items-center gap-1.5 rounded-full bg-red-900/50 px-3 py-1.5 text-xs font-semibold text-red-100 transition-colors hover:bg-red-900/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    <RotateCcw className="size-3.5" aria-hidden /> Retry microphone
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleStart(true)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-100 transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <Keyboard className="size-3.5" aria-hidden /> Practice by typing instead
                  </button>
                </div>
              </div>
            </div>
          )}

          {camNote && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-400">
              <CameraOff className="mt-0.5 size-4 shrink-0 text-zinc-500" aria-hidden /> {camNote}
            </div>
          )}

          {sttSupported === false && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-900/50 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                Voice recognition isn&rsquo;t supported in this browser (Chrome or Edge work best). You can
                still run the mock interview and type your answers — nothing else changes.
              </span>
            </div>
          )}

          <div className="mt-7">
            <button
              type="button"
              onClick={() => void handleStart()}
              disabled={starting}
              className={cn(
                buttonClasses({ size: "lg", className: "w-full justify-center bg-indigo-600 text-white hover:bg-indigo-500" }),
                starting && "cursor-not-allowed opacity-70"
              )}
            >
              {starting ? (
                <>
                  <LoaderCircle className="size-5 animate-spin" aria-hidden /> Checking devices…
                </>
              ) : (
                <>
                  <Mic className="size-5" aria-hidden /> Start mock interview
                </>
              )}
            </button>
            <p className="mt-3 text-center text-xs leading-relaxed text-zinc-500">
              {questionCount} prepared {questionCount === 1 ? "question" : "questions"} · {Math.min(targetCount || 10, questionCount)} will be asked
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
