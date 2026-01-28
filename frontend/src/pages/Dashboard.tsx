import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

import { Badge } from "@/components/ui/Badge";
import { api, handleApiError } from '@/lib/api';
import type { Upload } from '@/lib/types';
import { 
  Trash2, 
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileUp,
  Calendar,
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

  const handleParse = async (uploadId: string) => {
    try {
      setUploads(uploads.map(u => 
        u.uploadId === uploadId ? { ...u, status: 'processing' } : u
      ));
      await api.post(`/parse/${uploadId}`);
      await fetchUploads(); 
    } catch (err) {
      setError(handleApiError(err));
      await fetchUploads();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Only PDF files are allowed');
      return;
    }

    const maxSize = 10 * 1024 * 1024; 
    if (file.size > maxSize) {
      setError('File size must not exceed 10MB');
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

      setUploads(prev => [{
        uploadId: 'temp-' + Date.now(),
        userId: 0,
        bucket,
        key,
        status: 'uploading',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        analyses: []
      }, ...prev]);
      
      api.post(`/parse/${uploadId}`).then(() => {
        fetchUploads(); 
      }).catch(console.error);

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
    if (!confirm('Are you sure you want to delete this document?')) return;

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
        return <Badge variant="warning" className="bg-amber-500/10 text-amber-500 border-amber-500/20 shrink-0"><Clock className="h-3 w-3 mr-1" /> {status}</Badge>;
      case 'processed':
      case 'completed':
        return <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shrink-0"><CheckCircle2 className="h-3 w-3 mr-1" /> Ready</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="bg-rose-500/10 text-rose-500 border-rose-500/20 shrink-0"><AlertCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="secondary" className="shrink-0">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Header Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-gradient inline-block">Workspace</h1>
          <p className="text-muted-foreground text-lg max-w-xl leading-relaxed">
            Upload your homework PDFs and let our AI provide deep academic insights and solutions in seconds.
          </p>
        </div>
        
        <div className="flex flex-col justify-center">
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
                size="lg"
                className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/20 group relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
                <div className="flex items-center justify-center gap-3 relative z-10">
                    {uploading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <FileUp className="h-5 w-5 transition-transform group-hover:-translate-y-1" />
                    )}
                    <span className="font-semibold text-lg">{uploading ? "Uploading..." : "New Document"}</span>
                </div>
            </Button>
        </div>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3 p-4 text-rose-500 bg-rose-500/10 rounded-2xl border border-rose-500/20"
        >
          <AlertCircle className="h-5 w-5" />
          <p className="font-medium">{error}</p>
          <Button variant="ghost" size="sm" className="ml-auto text-rose-500 hover:bg-rose-500/10" onClick={() => setError('')}>Dismiss</Button>
        </motion.div>
      )}

      {/* Main Content Area */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Recent Documents
            <span className="ml-2 px-2 py-0.5 rounded-full bg-muted text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                {uploads.length} total
            </span>
          </h3>
          <div className="h-px flex-1 mx-6 bg-border opacity-50" />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-[220px] rounded-2xl bg-muted/20 animate-pulse relative overflow-hidden">
                  <div className="absolute inset-x-0 top-0 h-2/3 bg-gradient-to-b from-muted/30 to-transparent" />
              </div>
            ))}
          </div>
        ) : uploads.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center rounded-3xl border-2 border-dashed border-muted/50 bg-muted/5"
          >
            <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 ring-8 ring-primary/5">
              <FileText className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-2xl font-bold mb-2">No documents yet</h3>
            <p className="text-muted-foreground max-w-sm px-10 leading-relaxed">
              Your academic workspace is empty. Upload your first PDF to start your AI-powered learning journey.
            </p>
            <Button 
              variant="outline" 
              className="mt-8 rounded-xl h-12 px-8 border-primary/20 hover:bg-primary/5 transition-all"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload PDF
            </Button>
          </motion.div>
        ) : (
          <>
            <motion.div 
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {uploads.map((upload) => (
                <motion.div 
                  key={upload.uploadId}
                  variants={item}
                  whileHover={{ y: -4 }}
                  onClick={() => upload.status === 'processed' && navigate(`/upload/${upload.uploadId}`)}
                  className={cn(
                    "group relative glass-card rounded-3xl p-6 transition-all duration-300 cursor-pointer overflow-hidden border-white/5 hover:border-primary/20",
                    upload.status === 'processed' ? "hover:shadow-2xl hover:shadow-primary/5" : "opacity-80 grayscale-[0.5]"
                  )}
                >
                  {/* Card Background Pattern */}
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-110 transition-all pointer-events-none">
                     <FileText className="h-32 w-32 rotate-12" />
                  </div>

                  <div className="flex flex-col h-full justify-between relative z-10">
                    <div className="space-y-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-inner">
                                <FileText className="h-6 w-6" />
                            </div>
                            {getStatusBadge(upload.status)}
                        </div>

                        <div className="space-y-1">
                            <h4 className="font-bold text-lg leading-tight truncate group-hover:text-primary transition-colors" title={upload.key.split('/').pop()}>
                                {upload.key.split('/').pop()?.replace(/_\d+\.pdf$/, '.pdf')}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                <Calendar className="h-3 w-3" />
                                {new Date(upload.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                <span className="opacity-30">•</span>
                                <span>{(upload.size ? (upload.size / 1024 / 1024).toFixed(1) : '0')} MB</span>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 flex items-center justify-between mt-auto">
                        <div className="flex -space-x-2 overflow-hidden">
                             {upload.analyses && upload.analyses.length > 0 ? (
                                <div className="h-7 px-2 rounded-lg bg-emerald-500/10 text-emerald-500 text-[10px] font-bold flex items-center gap-1 border border-emerald-500/20">
                                   <CheckCircle2 className="h-3 w-3" />
                                   {upload.analyses.length} Analysis
                                </div>
                             ) : (
                                <div className="h-7 px-2 rounded-lg bg-muted text-[10px] text-muted-foreground font-bold flex items-center border border-border">
                                   No analysis
                                </div>
                             )}
                        </div>
                        
                        <div className="flex items-center gap-1">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 rounded-lg hover:bg-rose-500/10 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                                onClick={(e) => handleDelete(e, upload.uploadId)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            {upload.status === 'uploaded' && (
                                <Button 
                                    size="sm"
                                    className="h-8 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border-none"
                                    onClick={(e) => { e.stopPropagation(); handleParse(upload.uploadId); }}
                                >
                                    Process
                                </Button>
                            )}
                            {upload.status === 'processed' && (
                                <Button 
                                    variant="ghost"
                                    size="icon" 
                                    className="h-8 w-8 rounded-lg bg-primary/5 text-primary opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:text-primary-foreground"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
            
            {nextCursor && (
              <div className="flex justify-center mt-12">
                <Button 
                  variant="outline" 
                  onClick={() => fetchUploads(nextCursor)}
                  disabled={loadingMore}
                  className="rounded-2xl h-12 px-10 border-muted-foreground/20 bg-card/30 backdrop-blur-sm hover:bg-primary/5 hover:border-primary/50 transition-all"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                      Loading more...
                    </>
                  ) : (
                    'View More Documents'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

