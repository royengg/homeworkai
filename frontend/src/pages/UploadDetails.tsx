import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { uploadService } from "@/services/upload.service";
import {
  analysisService,
  type AnalysisMode,
} from "@/services/analysis.service";
import { useAnalysisPolling } from "@/lib/useAnalysisPolling";
import type { Upload } from "@/lib/types";
import { isAnalysisComplete } from "@/lib/utils";
import {
  ArrowLeft,
  Bot,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  Search,
  Loader2,
  Download,
  ScrollText,
  Calendar,
  Layers,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { AnalysisRenderer } from "@/components/analysis/AnalysisRenderer";

export function UploadDetails() {
  const { uploadId } = useParams<{ uploadId: string }>();
  const navigate = useNavigate();
  const [upload, setUpload] = useState<Upload | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [mode, setMode] = useState<AnalysisMode>("homework");
  const [sourceOpen, setSourceOpen] = useState(true);

  const fetchUploadDetails = useCallback(async (signal?: AbortSignal) => {
    if (!uploadId) return;

    const { data, error } = await uploadService.get(uploadId, signal);

    // Aborted (StrictMode unmount / navigation) returns silent nulls — leave
    // loading state alone so the caller's loading spinner doesn't snap to
    // a fake "Material Missing" screen before the retried request lands.
    if (signal?.aborted) return;

    if (error) {
      setApiError(error);
      setLoading(false);
    } else if (data) {
      setUpload(data.upload);
      setLoading(false);
    }
  }, [uploadId]);

  // Hardened polling: exponential backoff (2s → 15s), max 10 min, pauses
  // while the tab is hidden, aborts in-flight requests on unmount.
  const polling = useAnalysisPolling({
    uploadId: uploadId ?? "",
    onUpdate: (next) => setUpload(next),
    onTerminal: (reason) => {
      setAnalyzing(false);
      if (reason === "timeout") {
        setApiError(
          "Analysis is taking longer than usual — check back later.",
        );
      } else if (reason === "error") {
        setApiError("Lost connection while waiting for analysis.");
      }
    },
  });

  useEffect(() => {
    if (!uploadId) return;
    const controller = new AbortController();
    void fetchUploadDetails(controller.signal);
    return () => {
      controller.abort();
      polling.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadId]);

  const handleAnalyze = async () => {
    if (!uploadId) return;
    setAnalyzing(true);
    setApiError("");

    const { error } = await analysisService.run(uploadId, mode);

    if (error) {
      setApiError(error);
      setAnalyzing(false);
      return;
    }

    // Refresh once immediately, then start the backoff polling loop.
    await fetchUploadDetails();
    polling.start();
  };

  const handleDownload = async () => {
    if (!uploadId || !analysis?.id) return;
    setDownloading(true);
    setApiError("");

    // Render is idempotent: cache hit returns the existing presigned URL,
    // miss generates + uploads the PDF then returns the URL. Either way we
    // get a fresh presigned download URL back in one call.
    const { data, error } = await analysisService.render(uploadId, analysis.id);

    if (error) {
      setApiError(error);
    } else if (data) {
      window.open(data.url, "_blank", "noopener,noreferrer");
    }

    setDownloading(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-48 space-y-6">
        <Loader2 className="h-10 w-10 animate-spin text-zinc-300 dark:text-zinc-700" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-400">
          Synchronizing Synthesis
        </span>
      </div>
    );
  }

  if (!upload) {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-center space-y-6">
        <div className="h-16 w-16 rounded-2xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-400">
          <AlertCircle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold">Material Missing</h3>
          <p className="text-zinc-400 text-xs font-medium">
            We couldn't locate this specific document.
          </p>
        </div>
        <Button
          onClick={() => navigate("/dashboard")}
          variant="outline"
          className="rounded-xl"
        >
          Back to Workspace
        </Button>
      </div>
    );
  }

  const analysis = upload.analyses?.[0];
  const analysisComplete = isAnalysisComplete(analysis?.status);

  return (
    <div className="space-y-10">
      {/* API Error Notification */}
      {apiError && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bottom-8 right-8 z-50 flex items-center gap-4 p-5 bg-white dark:bg-zinc-900 border border-red-200 dark:border-red-900/30 rounded-3xl text-red-600 shadow-2xl"
        >
          <AlertCircle className="h-5 w-5" />
          <p className="font-bold text-sm">{apiError}</p>
          <button
            className="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full transition-colors"
            onClick={() => setApiError("")}
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}

      {/* Header Meta */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-8 border-b border-zinc-200 dark:border-zinc-700/70">
        <div className="space-y-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors group"
          >
            <ArrowLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" />{" "}
            Back to Dashboard
          </button>
          <div className="space-y-0.5">
            <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 truncate max-w-2xl leading-tight text-balance">
              {upload.key.startsWith("paste_")
                ? "Pasted Material"
                : upload.key
                    .split("/")
                    .pop()
                    ?.replace(/_\d+\.pdf$/, ".pdf")}
            </h1>
            <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mt-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />{" "}
                {new Date(upload.createdAt).toLocaleDateString()}
              </span>
              <span className="opacity-20">•</span>
              <span className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />{" "}
                {upload.size ? (upload.size / 1024 / 1024).toFixed(2) : "0"} MB
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {analysisComplete ? (
            <Button
              variant="outline"
              onClick={handleDownload}
              className="h-12 px-6 rounded-xl border-zinc-200 dark:border-zinc-800 text-xs font-bold uppercase tracking-widest gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-100/5 transition-all outline-none"
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export Solution
            </Button>
          ) : null}
          {/* {(!analysis || analysis.status === "failed") && (
            <Button
              onClick={handleAnalyze}
              className="h-12 px-10 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold text-xs uppercase tracking-[0.1em] gap-3 hover:scale-[0.98] transition-all shadow-premium"
              disabled={analyzing}
            >
              {analyzing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Generate Solution
            </Button>
          )} */}
        </div>
      </header>

      <div className="space-y-6">
        <aside className="space-y-3">
          <button
            type="button"
            onClick={() => setSourceOpen((open) => !open)}
            className="flex min-h-11 w-full items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white px-4 text-left transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            aria-expanded={sourceOpen}
          >
            <div className="flex items-center gap-2">
              <ScrollText className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-300" />
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-300">
                Context Extraction
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[10px] font-mono-alt uppercase tracking-widest text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 sm:inline-flex">
                Source text
                {upload.parseResult?.diagnostics
                  ? ` · ${Math.round(upload.parseResult.diagnostics.coverage * 100)}% coverage`
                  : ""}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-zinc-500 transition-transform dark:text-zinc-300 ${sourceOpen ? "rotate-180" : ""}`}
              />
            </div>
          </button>

          {upload.parseResult?.diagnostics?.warnings.length ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
              <strong>Extraction completed with warnings.</strong>{" "}
              {upload.parseResult.diagnostics.warnings
                .slice(0, 3)
                .map((warning) => warning.message)
                .join(" ")}
              {upload.parseResult.diagnostics.warnings.length > 3
                ? ` ${upload.parseResult.diagnostics.warnings.length - 3} more warning(s).`
                : ""}
            </div>
          ) : null}

          {sourceOpen ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative max-h-[420px] overflow-hidden rounded-3xl border border-zinc-200 bg-white p-4 shadow-soft dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div className="max-h-[388px] overflow-y-auto scrollbar-hide whitespace-pre-wrap rounded-2xl bg-zinc-50 p-5 font-mono text-[12px] leading-6 text-zinc-700 selection:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:selection:bg-zinc-700">
                {upload.parseResult ? (
                  upload.parseResult.text
                ) : (
                  <div className="flex flex-col items-center justify-center h-[240px] text-center space-y-4 text-zinc-400 dark:text-zinc-500">
                    <Search className="h-8 w-8" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">
                      Waiting for OCR parse
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : null}
        </aside>

        <main className="space-y-3">
          <div className="space-y-3">
            <div className="flex flex-col gap-3 rounded-3xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-3.5 w-3.5 text-zinc-900 dark:text-zinc-100" />
                <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-300">
                  Analysis Output
                </h3>
              </div>
              {!analysisComplete ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="inline-flex rounded-2xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800">
                    <button
                      type="button"
                      onClick={() => setMode("homework")}
                      className={`min-h-9 rounded-xl px-3 text-xs font-semibold transition-colors ${mode === "homework" ? "bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"}`}
                    >
                      Problem set
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("assignment")}
                      className={`min-h-9 rounded-xl px-3 text-xs font-semibold transition-colors ${mode === "assignment" ? "bg-zinc-900 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"}`}
                    >
                      Essay brief
                    </button>
                  </div>
                  <Button
                    onClick={handleAnalyze}
                    className="h-10 rounded-2xl bg-zinc-900 px-4 text-xs font-semibold text-white shadow-none transition-transform hover:scale-[0.98] dark:bg-zinc-100 dark:text-zinc-900"
                    disabled={analyzing}
                  >
                    {analyzing ? "Generating..." : "Generate"}
                  </Button>
                </div>
              ) : null}
            </div>

            {(analysis || analyzing) && (
              <div className="relative min-h-[460px] overflow-hidden rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900 md:p-8">
                {analyzing ? (
                  <div className="flex min-h-[360px] flex-col items-center justify-center space-y-6">
                    <div className="relative">
                      <RefreshCw className="h-12 w-12 text-zinc-400 dark:text-zinc-500 animate-spin relative" />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-zinc-400">
                        Crafting your solution
                      </p>
                      <h4 className="text-xl font-semibold text-zinc-600 dark:text-zinc-300">
                        Compiling each section...
                      </h4>
                    </div>
                  </div>
                ) : (
                  <div className="relative z-10 transition-all duration-700">
                    {analysis?.output ? (
                      <AnalysisRenderer content={analysis.output} />
                    ) : (
                      <p className="py-20 text-center text-sm text-zinc-500">
                        The analysis output is not available yet.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
