import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

import { Badge } from "@/components/ui/Badge";
import { api, handleApiError } from '@/lib/api';
import type { Upload } from '@/lib/types';
import { 
  Trash2, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileUp,
  Layers,
  FileText,
  Clock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export function Dashboard() {
  const navigate = useNavigate();
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchUploads();
  }, []);

  const fetchUploads = async (cursor?: string | null) => {
    try {
      if (cursor) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      
      const query = cursor ? `?cursor=${cursor}&limit=12` : `?limit=12`;
      const response = await api.get<{ items: Upload[], nextCursor: string | null }>(`/upload/list${query}`);
      
      if (cursor) {
        setUploads(prev => [...prev, ...response.data.items]);
      } else {
        setUploads(response.data.items);
      }
      setNextCursor(response.data.nextCursor);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };



  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Only PDF files are allowed');
      return;
    }

    const maxSize = 20 * 1024 * 1024; 
    if (file.size > maxSize) {
      setError('File size must not exceed 20MB');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const presignResponse = await api.post('/upload/presign', {
        filename: file.name,
        contentType: file.type,
        fileSize: file.size,
      });

      const { url, uploadId, bucket, key } = presignResponse.data;

      await fetch(url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      await api.post('/upload/confirm', {
        bucket,
        key,
      });
      
      await api.post(`/parse/${uploadId}`).catch(console.error);
      await fetchUploads();
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = ''; 
    }
  };

  const handleDelete = async (e: React.MouseEvent, uploadId: string) => {
    e.stopPropagation();
    if (!confirm('Permanently delete this research material?')) return;

    try {
      await api.delete(`/upload/${uploadId}/delete`);
      setUploads(uploads.filter(u => u.uploadId !== uploadId));
    } catch (err) {
      setError(handleApiError(err));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processing':
      case 'uploading':
        return <Badge variant="outline" className="text-[10px] bg-zinc-100/50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 font-bold uppercase tracking-widest px-2 py-0 border leading-none"><Clock className="h-2.5 w-2.5 mr-1 animate-pulse" /> {status}</Badge>;
      case 'processed':
      case 'completed':
        return <Badge variant="outline" className="text-[10px] bg-zinc-900 dark:bg-white text-white dark:text-black font-bold uppercase tracking-widest px-2 py-0 border leading-none">Ready</Badge>;
      case 'failed':
        return <Badge variant="outline" className="text-[10px] bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 font-bold uppercase tracking-widest px-2 py-0 border leading-none">Error</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest px-2 py-0 border leading-none">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-12">
      {/* Dynamic Workspace Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
             <div className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
             <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Personal Hub</span>
          </div>
          <h1 className="text-5xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 drop-shadow-sm">
            Documents
          </h1>
          <p className="text-muted-foreground text-sm font-medium max-w-sm leading-relaxed">
            Manage and research your academic source material with deep AI extraction.
          </p>
        </div>
        
        <div className="flex-shrink-0">
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
            />
            <Button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="h-14 px-8 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black hover:scale-[0.98] transition-transform shadow-2xl shadow-zinc-500/10 font-bold text-sm tracking-tight flex items-center gap-3"
            >
                {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <FileUp className="h-4 w-4" />
                )}
                <span>{uploading ? "Ingesting..." : "Import Material"}</span>
            </Button>
        </div>
      </section>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 text-xs font-bold bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl"
        >
          <AlertCircle className="h-4 w-4 text-red-500" />
          <p className="flex-1">{error}</p>
          <button className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100" onClick={() => setError('')}>Dismiss</button>
        </motion.div>
      )}

      {/* Grid Flow */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/50 pb-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-zinc-400" />
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
               Source Library
            </h3>
          </div>
          <span className="text-[10px] font-bold bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded text-zinc-500">
              {uploads.length} Items Total
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 animate-shimmer relative overflow-hidden border border-zinc-100 dark:border-zinc-800" />
            ))}
          </div>
        ) : uploads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/10">
            <div className="h-16 w-16 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-6 text-zinc-300">
              <FileText className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold">No research material</h3>
            <p className="text-zinc-400 text-xs font-medium max-w-[200px] text-center mt-1 leading-relaxed">
              Upload your first PDF to begin your academic synthesis.
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
                onClick={() => upload.status === 'processed' && navigate(`/upload/${upload.uploadId}`)}
                className={cn(
                  "group relative rounded-[1.5rem] p-5 border transition-all duration-500 overflow-hidden flex flex-col justify-between h-48",
                  upload.status === 'processed' 
                    ? "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-zinc-100 cursor-pointer shadow-soft hover:shadow-2xl" 
                    : "bg-zinc-50/50 dark:bg-zinc-950 border-zinc-100 dark:border-zinc-800/40 opacity-70"
                )}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="h-10 w-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
                      <FileText className="h-5 w-5" />
                    </div>
                    {getStatusBadge(upload.status)}
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm leading-tight text-zinc-900 dark:text-zinc-100 truncate pr-4">
                      {upload.key.split('/').pop()?.replace(/_\d+\.pdf$/, '.pdf')}
                    </h4>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-tight">
                       {new Date(upload.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                       <span className="opacity-20">•</span>
                       {(upload.size ? (upload.size / 1024 / 1024).toFixed(1) : '0')}MB
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-zinc-50 dark:border-zinc-800">
                   <div className="flex items-center gap-2">
                       {upload.analyses && upload.analyses.length > 0 ? (
                          <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                             <CheckCircle2 className="h-3 w-3" /> Synthesis Ready
                          </div>
                       ) : (
                          <div className="text-[10px] font-black text-zinc-300 dark:text-zinc-600 uppercase tracking-widest">
                             Inert Source
                          </div>
                       )}
                   </div>
                   
                   <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 opacity-0 group-hover:opacity-100 transition-all pointer-events-auto"
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
                className="rounded-xl h-12 px-10 border-zinc-200 dark:border-zinc-800 text-xs font-bold uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
                {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : "Extend Library"}
            </Button>
        </div>
      )}
    </div>
  );
}


