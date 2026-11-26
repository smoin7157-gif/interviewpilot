/**
 * Client-only UI preferences for the interview workspace.
 * Kept separate from draft buffers so focus mode can be tested without DOM.
 */

export const WORKSPACE_FOCUS_MODE_KEY = "ip_workspace_focus";

const FOCUS_CHANGE_EVENT = "interviewos:workspace-focus-change";

export function readWorkspaceFocusMode(storage: Pick<Storage, "getItem"> | null = getStorage()): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(WORKSPACE_FOCUS_MODE_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeWorkspaceFocusMode(
  on: boolean,
  storage: Pick<Storage, "setItem"> | null = getStorage()
): void {
  if (!storage) return;
  try {
    storage.setItem(WORKSPACE_FOCUS_MODE_KEY, on ? "1" : "0");
  } catch {
    // Private mode / quota — preference stays session-scoped.
  }
}

/** React external-store subscription for focus mode (client-only). */
export function subscribeWorkspaceFocusMode(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onFocusChange = () => onStoreChange();
  const onStorage = (event: StorageEvent) => {
    if (event.key === WORKSPACE_FOCUS_MODE_KEY) onStoreChange();
  };
  window.addEventListener(FOCUS_CHANGE_EVENT, onFocusChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(FOCUS_CHANGE_EVENT, onFocusChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function toggleWorkspaceFocusMode(): boolean {
  const next = !readWorkspaceFocusMode();
  writeWorkspaceFocusMode(next);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(FOCUS_CHANGE_EVENT));
  }
  return next;
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}