import { useCallback, useEffect, useRef } from "react";
import { uploadService } from "@/services/upload.service";
import type { Upload } from "@/lib/types";

interface Options {
  uploadId: string;
  // Called with the freshly fetched upload whenever the analysis status
  // changes (running -> running is also fine to update progress UI).
  onUpdate: (upload: Upload) => void;
  // Called once when the analysis reaches a terminal status (completed / failed)
  // OR when the polling gives up after maxDurationMs / maxAttempts.
  onTerminal: (reason: "completed" | "failed" | "timeout" | "error") => void;
  // Hard cap on total polling time.
  maxDurationMs?: number;
}

const DEFAULT_MAX_DURATION_MS = 10 * 60 * 1000; // 10 minutes
const INITIAL_DELAY_MS = 2000;
const MAX_DELAY_MS = 15_000;

/**
 * Polls the upload's most recent analysis with exponential backoff (2s → 15s),
 * pauses when the tab is hidden, and gives up after `maxDurationMs`. All
 * network requests are aborted on unmount or when `active` becomes false so
 * stale closures cannot setState on an unmounted component.
 *
 * Use the returned `start` and `stop` functions from an event handler (rule:
 * rerender-move-effect-to-event); the hook itself never auto-starts.
 */
export function useAnalysisPolling({
  uploadId,
  onUpdate,
  onTerminal,
  maxDurationMs = DEFAULT_MAX_DURATION_MS,
}: Options): {
  start: () => void;
  stop: () => void;
} {
  // Refs so the timer callback never closes over a stale prop/function.
  const onUpdateRef = useRef(onUpdate);
  const onTerminalRef = useRef(onTerminal);
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef<number>(0);
  const delayRef = useRef(INITIAL_DELAY_MS);
  const stoppedRef = useRef(false);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
    onTerminalRef.current = onTerminal;
  });

  const stop = useCallback(() => {
    stoppedRef.current = true;
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const tick = useCallback(async () => {
    if (stoppedRef.current) return;
    // Pause while the tab is hidden — saves server load and avoids waking the
    // CPU on mobile. Browsers still fire the timeout while hidden, but we
    // skip the network round-trip and reschedule for the next visible tick.
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      timeoutRef.current = setTimeout(tick, delayRef.current);
      return;
    }

    // Hard timeout safety net.
    if (Date.now() - startedAtRef.current > maxDurationMs) {
      onTerminalRef.current("timeout");
      stop();
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const { data, error } = await uploadService.get(uploadId, controller.signal);
    if (stoppedRef.current) return;

    if (error) {
      onTerminalRef.current("error");
      stop();
      return;
    }

    if (!data) {
      // No data and no error — retry on the same cadence.
      timeoutRef.current = setTimeout(tick, delayRef.current);
      return;
    }

    onUpdateRef.current(data.upload);
    const status = data.upload.analyses?.[0]?.status;
    if (status === "completed" || status === "failed") {
      onTerminalRef.current(status);
      stop();
      return;
    }

    // Exponential backoff capped at MAX_DELAY_MS.
    delayRef.current = Math.min(delayRef.current * 1.5, MAX_DELAY_MS);
    timeoutRef.current = setTimeout(tick, delayRef.current);
  }, [uploadId, maxDurationMs, stop]);

  const start = useCallback(() => {
    // Reset state for a fresh poll cycle.
    stop();
    stoppedRef.current = false;
    startedAtRef.current = Date.now();
    delayRef.current = INITIAL_DELAY_MS;
    timeoutRef.current = setTimeout(tick, delayRef.current);
  }, [stop, tick]);

  // Cancel any pending work if the component using this hook unmounts.
  useEffect(() => {
    return () => {
      stoppedRef.current = true;
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, []);

  return { start, stop };
}