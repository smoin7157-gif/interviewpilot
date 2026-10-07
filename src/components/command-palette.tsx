"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CircleHelp,
  ClipboardList,
  History,
  LayoutDashboard,
  Plus,
  Search,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn, FOCUSABLE_SELECTOR } from "@/lib/utils";

/**
 * Command palette ("⌘K" / "Ctrl+K").
 *
 * A keyboard-first launcher for everywhere in the app: jump to any top-level
 * page or start a new interview without touching the mouse. It is opt-in
 * decoration — every command is also reachable through the sidebar — so it can
 * never be the only path to a screen.
 *
 * Kept decoupled from the app shell via a window event
 * (`openCommandPalette()`), so triggers can live in the sidebar and the mobile
 * top bar without threading state through `AppShell`.
 */

const OPEN_EVENT = "interviewos:command-palette";

/** Ask the mounted palette to open (no-op when it isn't rendered). */
export function openCommandPalette() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_EVENT));
}

interface Command {
  id: string;
  label: string;
  /** Small secondary line shown under the label. */
  hint: string;
  href: string;
  icon: LucideIcon;
  /** Extra search terms that aren't part of the visible label. */
  keywords: string[];
}

const COMMANDS: Command[] = [
  {
    id: "new-interview",
    label: "Create interview",
    hint: "Start a new practice session",
    href: "/interviews/new",
    icon: Plus,
    keywords: ["new", "generate", "practice", "role", "start"],
  },
  {
    id: "dashboard",
    label: "Dashboard",
    hint: "Progress, recent interviews, next step",
    href: "/dashboard",
    icon: LayoutDashboard,
    keywords: ["home", "overview", "progress"],
  },
  {
    id: "interviews",
    label: "My Interviews",
    hint: "All generated question sets",
    href: "/interviews",
    icon: ClipboardList,
    keywords: ["list", "sessions", "questions"],
  },
  {
    id: "history",
    label: "Mock History",
    hint: "Spoken sessions and debriefs",
    href: "/history",
    icon: History,
    keywords: ["mock", "voice", "debrief", "scores", "transcript"],
  },
  {
    id: "faq",
    label: "FAQ",
    hint: "How InterviewOS works",
    href: "/faq",
    icon: CircleHelp,
    keywords: ["help", "questions", "support"],
  },
  {
    id: "settings",
    label: "Settings",
    hint: "Profile name and password",
    href: "/settings",
    icon: Settings,
    keywords: ["profile", "account", "password", "name"],
  },
];

function matches(command: Command, query: string): boolean {
  if (!query) return true;
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [command.label, command.hint, ...command.keywords].some((term) =>
    term.toLowerCase().includes(needle)
  );
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const listboxId = useId();

  const results = useMemo(() => COMMANDS.filter((command) => matches(command, query)), [query]);

  const close = useCallback(() => setOpen(false), []);

  const run = useCallback(
    (command: Command | undefined) => {
      if (!command) return;
      setOpen(false);
      router.push(command.href);
    },
    [router]
  );

  // A fresh open always starts from a blank query and the first command; a
  // stale highlight from the last visit would otherwise point at a different
  // row than the user remembered. State resets live here (not in the effect
  // below) so they run as part of the open interaction.
  const openPalette = useCallback(() => {
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setQuery("");
    setActiveIndex(0);
    setOpen(true);
  }, []);

  // Global shortcut: ⌘K / Ctrl+K toggles the palette from anywhere.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (open) setOpen(false);
        else openPalette();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, openPalette]);

  // External open requests (sidebar / mobile triggers).
  useEffect(() => {
    function onOpen() {
      openPalette();
    }
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, [openPalette]);

  // While open: lock background scroll, move focus into the search field, and
  // hand focus back to the trigger on close. DOM-only, no state writes.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus();
    };
  }, [open]);

  // Keep the highlighted row visible while arrowing through a long list.
  useEffect(() => {
    if (!open) return;
    const option = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    option?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((index) => (results.length === 0 ? 0 : (index + 1) % results.length));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((index) =>
          results.length === 0 ? 0 : (index - 1 + results.length) % results.length
        );
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        run(results[activeIndex]);
        return;
      }
      if (event.key !== "Tab") return;
      // Trap focus inside the panel while it is open.
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [activeIndex, close, results, run]
  );

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-start justify-center p-4 pt-[12vh]">
      <div
        aria-hidden="true"
        onClick={close}
        className="absolute inset-0 h-full w-full bg-zinc-950/40 backdrop-blur-[1px]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={handleKeyDown}
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(16,21,40,.06),0_24px_60px_-24px_rgba(16,21,40,.45)]"
      >
        <div className="flex items-center gap-3 border-b border-zinc-200 px-4">
          <Search className="size-4 shrink-0 text-zinc-400" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            role="combobox"
            aria-expanded
            aria-controls={listboxId}
            aria-activedescendant={results[activeIndex] ? `${listboxId}-${results[activeIndex].id}` : undefined}
            aria-label="Search commands"
            placeholder="Search pages and actions…"
            autoComplete="off"
            spellCheck={false}
            className="h-14 w-full bg-transparent text-[15px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
          />
        </div>

        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label="Commands"
          className="max-h-[min(24rem,50vh)] overflow-y-auto p-2"
        >
          {results.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-zinc-500">
              No matches for “{query}”.
            </li>
          ) : (
            results.map((command, index) => {
              const active = index === activeIndex;
              return (
                <li
                  key={command.id}
                  id={`${listboxId}-${command.id}`}
                  role="option"
                  aria-selected={active}
                >
                  <button
                    type="button"
                    data-index={index}
                    onClick={() => run(command)}
                    onMouseMove={() => setActiveIndex(index)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                      "focus-visible:outline-none",
                      active ? "bg-indigo-50" : "hover:bg-zinc-50"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg",
                        active ? "bg-white text-indigo-600 shadow-sm" : "bg-zinc-100 text-zinc-500"
                      )}
                    >
                      <command.icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-sm font-semibold",
                          active ? "text-indigo-700" : "text-zinc-900"
                        )}
                      >
                        {command.label}
                      </span>
                      <span className="block truncate text-xs text-zinc-500">{command.hint}</span>
                    </span>
                    {active && (
                      <ArrowRight className="size-4 shrink-0 text-indigo-500" aria-hidden />
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>

        <div className="flex items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50 px-4 py-2.5 text-[11px] font-medium text-zinc-400">
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 font-sans">↑</kbd>
            <kbd className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 font-sans">↓</kbd>
            to navigate
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 font-sans">↵</kbd>
            to open
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 font-sans">esc</kbd>
            to close
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * Sidebar / top-bar trigger. Renders as a search field on desktop and an icon
 * button on mobile, and always opens the palette via the shared event.
 */
export function CommandPaletteTrigger({ variant = "sidebar" }: { variant?: "sidebar" | "icon" }) {
  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={openCommandPalette}
        aria-label="Search (Command K)"
        className="rounded-md p-2 text-zinc-600 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <Search className="size-5" aria-hidden />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={openCommandPalette}
      className="flex h-10 w-full items-center gap-2.5 rounded-full border border-zinc-200 bg-white px-3 text-sm text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      <Search className="size-4 shrink-0 text-zinc-400" aria-hidden />
      <span className="flex-1 text-left">Search</span>
      <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[11px] font-medium text-zinc-400">
        ⌘K
      </kbd>
    </button>
  );
}
