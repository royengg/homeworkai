import { prisma } from "../db/prisma.db";
import { AnalysisStatus } from "@prisma/client";
import { logger } from "../config/logger.config";

const SWEEP_INTERVAL_MS = 60_000;
const STUCK_THRESHOLD_MS = 10 * 60 * 1000;

export interface Sweeper {
  stop: () => void;
}

/**
 * Reap AnalysisResult rows left in "running" state after a worker died
 * (SIGKILL, OOM, container restart) without flipping status. Anything older
 * than the threshold is marked failed so the user sees an error rather than an
 * infinite spinner, and the worker is free to retry it on the next attempt.
 */
export function startStuckAnalysisSweeper(intervalMs = SWEEP_INTERVAL_MS): Sweeper {
  const timer = setInterval(async () => {
    try {
      const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MS);
      const result = await prisma.analysisResult.updateMany({
        where: {
          status: AnalysisStatus.running,
          updatedAt: { lt: cutoff },
        },
        data: {
          status: AnalysisStatus.failed,
          error: "Worker crashed mid-analysis; please retry.",
        },
      });
      if (result.count > 0) {
        logger.warn("Sweeper failed stuck analyses", { count: result.count });
      }
    } catch (e) {
      logger.error("Sweeper error", {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }, intervalMs);

  // Don't keep the event loop alive solely for this timer.
  if (typeof timer.unref === "function") timer.unref();

  return {
    stop: () => clearInterval(timer),
  };
}