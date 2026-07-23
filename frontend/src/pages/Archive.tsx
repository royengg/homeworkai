import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { uploadService } from "@/services/upload.service";
import { useUploadFlow } from "@/lib/useUploadFlow";
import type { Upload } from "@/lib/types";
import {
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  FileText,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function Archive() {
  const navigate = useNavigate();
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { uploading, error: uploadError, uploadFile, reset } =
    useUploadFlow();

  const fetchUploads = useCallback(async (cursor?: string | null) => {
    if (cursor) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    const { data, error: fetchError } = await uploadService.list(cursor, 12);

    if (fetchError) {
      setError(fetchError);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    if (data) {
      if (cursor) {
        setUploads((prev) => [...prev, ...data.items]);
      } else {
        setUploads(data.items);
      }
      setNextCursor(data.nextCursor);
    }

    setLoading(false);
    setLoadingMore(false);
  }, []);

  useEffect(() => {
    void fetchUploads();
  }, [fetchUploads]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");

    const newUploadId = await uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!newUploadId) {
      // uploadFile already surfaced the error through the hook state.
      return;
    }
    await fetchUploads();
  };

  const handleDelete = async (e: React.MouseEvent, uploadId: string) => {
    e.stopPropagation();
    if (!confirm("Permanently delete this research material?")) return;

    const { error: deleteError } = await uploadService.delete(uploadId);

    if (deleteError) {
      setError(deleteError);
      return;
    }

    // Functional update — avoid stale-closure overwrite (rule:
    // rerender-functional-setstate).
    setUploads((prev) => prev.filter((u) => u.uploadId !== uploadId));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "processing":
      case "uploading":
        return (
          <Badge
            variant="outline"
            className="text-[10px] bg-white/70 border-[#1c1b19] text-[#3b3a37] font-mono-alt uppercase tracking-widest px-2 py-0 border leading-none"
          >
            <Clock className="h-2.5 w-2.5 mr-1 animate-pulse" /> {status}
          </Badge>
        );
      case "processed":
      case "completed":
        return (
          <Badge
            variant="outline"
            className="text-[10px] bg-[#1c1b19] text-[#f7f3ee] font-mono-alt uppercase tracking-widest px-2 py-0 border leading-none"
          >
            Ready
          </Badge>
        );
      case "failed":
        return (
          <Badge
            variant="outline"
            className="text-[10px] bg-red-50 text-red-700 border-red-200 font-mono-alt uppercase tracking-widest px-2 py-0 border leading-none"
          >
            Error
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="text-[10px] font-mono-alt uppercase tracking-widest px-2 py-0 border leading-none"
          >
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-12 text-[#1c1b19] dark:text-[#f7f3ee]">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-4">
        <div className="space-y-1.5">
          <h1 className="text-5xl font-semibold tracking-tight text-balance">
            Archive
          </h1>
          <p className="text-[#3b3a37] dark:text-[#b9b3aa] text-sm font-medium max-w-sm leading-relaxed">
            Every upload and generated solution.
          </p>
        </div>

        <div className="flex-shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
          {/* <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="h-14 px-8 rounded-full bg-[#1c1b19] dark:bg-[#f7f3ee] text-[#f7f3ee] dark:text-[#1c1b19] hover:scale-[0.98] transition-transform shadow-warm font-bold text-sm tracking-tight flex items-center gap-3"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileUp className="h-4 w-4" />
            )}
            <span>{uploading ? "Uploading..." : "Import Material"}</span>
          </Button> */}
        </div>
      </section>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 text-xs font-bold bg-white/70 dark:bg-[#121212] border border-[#1c1b19] dark:border-[#2a2a2a] rounded-xl"
        >
          <AlertCircle className="h-4 w-4 text-red-600" />
          <p className="flex-1">{error}</p>
          <button
            aria-label="Dismiss error"
            className="text-[#3b3a37] dark:text-[#b9b3aa] hover:text-[#1c1b19]"
            onClick={() => setError("")}
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}

      {!error && uploadError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 text-xs font-bold bg-white/70 dark:bg-[#121212] border border-[#1c1b19] dark:border-[#2a2a2a] rounded-xl"
        >
          <AlertCircle className="h-4 w-4 text-red-600" />
          <p className="flex-1">{uploadError}</p>
          <button
            aria-label="Dismiss error"
            className="text-[#3b3a37] dark:text-[#b9b3aa] hover:text-[#1c1b19]"
            onClick={reset}
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}

      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-[#1c1b19] dark:border-[#2a2a2a] pb-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#3b3a37] dark:text-[#b9b3aa]" />
            <h3 className="text-xs font-mono-alt uppercase tracking-[0.2em] text-[#3b3a37] dark:text-[#b9b3aa]">
              Past Analysis
            </h3>
          </div>
          <span className="text-[10px] font-mono-alt bg-white/70 dark:bg-[#121212] px-2 py-0.5 rounded border border-[#1c1b19] dark:border-[#2a2a2a] text-[#3b3a37] dark:text-[#b9b3aa]">
            {uploads.length} Items Loaded
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="h-48 rounded-2xl bg-white/60 dark:bg-[#121212] animate-shimmer relative overflow-hidden border border-[#1c1b19] dark:border-[#2a2a2a]"
              />
            ))}
          </div>
        ) : uploads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 rounded-3xl border border-dashed border-[#1c1b19] dark:border-[#2a2a2a] bg-white/60 dark:bg-[#121212]">
            <div className="h-16 w-16 rounded-2xl border border-[#1c1b19] dark:border-[#2a2a2a] flex items-center justify-center mb-6 text-[#3b3a37] dark:text-[#b9b3aa]">
              <FileText className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold">No research material</h3>
            <p className="text-[#3b3a37] dark:text-[#b9b3aa] text-xs font-medium max-w-[200px] text-center mt-1 leading-relaxed">
              Upload your first assignment to begin your academic comeback.
            </p>
          </div>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {uploads.map((upload) => (
              <motion.div
                key={upload.uploadId}
                variants={item}
                role={upload.status === "processed" ? "button" : undefined}
                tabIndex={upload.status === "processed" ? 0 : undefined}
                aria-label={
                  upload.status === "processed"
                    ? `Open ${upload.key.split("/").pop() ?? "upload"}`
                    : undefined
                }
                onClick={() =>
                  upload.status === "processed" &&
                  navigate(`/upload/${upload.uploadId}`)
                }
                onKeyDown={(e) => {
                  if (
                    upload.status === "processed" &&
                    (e.key === "Enter" || e.key === " ")
                  ) {
                    e.preventDefault();
                    navigate(`/upload/${upload.uploadId}`);
                  }
                }}
                className={cn(
                  "group relative rounded-[1.5rem] p-5 border transition-all duration-500 overflow-hidden flex flex-col justify-between h-48",
                  upload.status === "processed"
                    ? "bg-white/80 dark:bg-[#121212] border-[#1c1b19] dark:border-[#2a2a2a] hover:-translate-y-1 hover:scale-[1.01] hover:border-[#706a62] dark:hover:border-[#5a5a5a] hover:bg-white dark:hover:bg-[#181818] cursor-pointer shadow-soft transition-[transform,background-color,border-color] ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#706a62] dark:focus-visible:ring-[#5a5a5a]"
                    : "bg-white/40 dark:bg-[#0f0f0f] border-[#1c1b19] dark:border-[#2a2a2a] opacity-70",
                )}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="h-10 w-10 rounded-xl border border-[#1c1b19] dark:border-[#2a2a2a] flex items-center justify-center text-[#3b3a37] dark:text-[#b9b3aa] group-hover:text-[#1c1b19] transition-colors">
                      <FileText className="h-5 w-5" />
                    </div>
                    {getStatusBadge(upload.status)}
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-bold text-sm leading-tight truncate pr-4">
                      {upload.key.startsWith("paste_")
                        ? "Pasted Material"
                        : upload.key
                            .split("/")
                            .pop()
                            ?.replace(/_\d+\.pdf$/, ".pdf")}
                    </h4>
                    <div className="flex items-center gap-2 text-[10px] font-mono-alt text-[#3b3a37] dark:text-[#b9b3aa] uppercase tracking-tight">
                      {new Date(upload.createdAt).toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric" },
                      )}
                      <span className="opacity-20">•</span>
                      {upload.size
                        ? (upload.size / 1024 / 1024).toFixed(1)
                        : "0"}
                      MB
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[#1c1b19] dark:border-[#2a2a2a]">
                  <div className="flex items-center gap-2">
                    {upload.analyses && upload.analyses.length > 0 ? (
                      <div className="text-[10px] font-mono-alt text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Solution Ready
                      </div>
                    ) : (
                      <div className="text-[10px] font-mono-alt text-[#3b3a37] dark:text-[#b9b3aa] uppercase tracking-widest">
                        Uploaded
                      </div>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg text-[#3b3a37] opacity-60 transition-[opacity,transform,background-color,color] duration-200 ease-out hover:scale-105 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:text-[#b9b3aa] pointer-events-auto"
                    onClick={(e) => handleDelete(e, upload.uploadId)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {nextCursor && (
        <div className="flex justify-center pt-8">
          <Button
            variant="outline"
            onClick={() => fetchUploads(nextCursor)}
            disabled={loadingMore}
            className="rounded-full h-12 px-10 border-[#1c1b19] dark:border-[#2a2a2a] text-xs font-mono-alt uppercase tracking-widest hover:bg-white/70 dark:hover:bg-[#161616]"
          >
            {loadingMore ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Extend Library"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
