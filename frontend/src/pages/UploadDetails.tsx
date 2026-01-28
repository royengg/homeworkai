import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { api, handleApiError } from '@/lib/api';
import type { Upload, AnalysisOutput } from '@/lib/types';
import { 
  ArrowLeft, 
  Bot, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Search,
  Loader2,
  Download,
  ScrollText,
  BookOpenCheck,
  Calendar,
  Layers,
  X
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Separator } from '@/components/ui/Separator';

const MarkdownRenderer = ({ content }: { content: AnalysisOutput }) => {
  if (!content) return null;
  
  if (content.type === 'assignment' && content.assignment) {
    const { assignment } = content;
    return (
      <div className="space-y-16 pb-20">
        <header className="space-y-4 text-center border-b border-border/10 pb-12">
          <Badge variant="outline" className="px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-bold text-primary border-primary/20 bg-primary/5">
             Synthesis Report
          </Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-[1.1]">
            {assignment.title}
          </h1>
          <p className="text-xl text-muted-foreground/80 max-w-2xl mx-auto font-medium leading-relaxed italic">
            "{assignment.blueprint?.description}"
          </p>
        </header>

        <div className="space-y-24">
          {assignment.sections?.map((section, idx: number) => (
            <motion.section 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              key={section.section_id || idx} 
              className="relative"
            >
              <div className="absolute -left-12 top-0 hidden lg:flex flex-col items-center gap-4">
                  <div className="h-10 w-10 rounded-full border border-border flex items-center justify-center font-bold text-xs text-zinc-400 bg-background self-start">
                     {idx + 1}
                  </div>
                  <div className="w-px h-full bg-gradient-to-b from-border/50 to-transparent" />
              </div>

              <div className="space-y-8">
                <div className="space-y-2">
                    <h2 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
                        {assignment.blueprint?.sections?.find(s => s.id === section.section_id)?.title || `Chapter ${idx + 1}`}
                    </h2>
                    <div className="h-1 w-16 bg-zinc-900 dark:bg-zinc-100 rounded-full" />
                </div>

                <div className="prose prose-lg dark:prose-invert max-w-none text-foreground/80 leading-relaxed font-inter">
                  {section.content.split('\n').map((para: string, pIdx: number) => (
                    para.trim() ? <p key={pIdx} className="mb-6">{para}</p> : null
                  ))}
                </div>

                {section.citations && section.citations.length > 0 && (
                  <div className="mt-12 p-8 glass-card rounded-3xl border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-6 flex items-center gap-2">
                      <BookOpenCheck className="h-3.5 w-3.5" /> Source Material Synthesis
                    </h4>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {section.citations.map((c, i: number) => (
                        <li key={i} className="flex items-start gap-3 text-xs text-muted-foreground leading-relaxed bg-white/50 dark:bg-black/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800/50">
                           <span className="text-zinc-900 dark:text-zinc-100 font-bold shrink-0">[{i+1}]</span>
                           {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.section>
          ))}
        </div>
      </div>
    );
  }

  if (content.type === 'homework' && content.questions && content.questions.length > 0) {
    const questions = content.questions;
    return (
      <div className="space-y-16">
        {questions.map((q, qIdx: number) => (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: qIdx * 0.1 }}
            key={q.qid} 
            className="group space-y-10"
          >
            <div className="space-y-8">
                <div className="flex items-start gap-6">
                    <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 font-bold text-lg shadow-premium">
                        {q.qid.replace(/Q/i, '')}
                    </div>
                    <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Problem Synthesis</span>
                        <h3 className="text-2xl font-bold tracking-tight text-foreground">
                            {q.question_text}
                        </h3>
                    </div>
                </div>
                
                <div className="space-y-12 pl-4 md:pl-10 border-l border-zinc-100 dark:border-zinc-800 ml-6 md:ml-6 pt-4">
                {q.parts?.map((p, idx: number) => (
                    <div key={idx} className="space-y-8 relative">
                        <div className="absolute -left-[17.5px] md:-left-[41.5px] top-4 w-2 h-2 rounded-full bg-zinc-900 dark:bg-zinc-100" />
                        
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-500 text-[10px] font-bold uppercase tracking-widest border border-zinc-200 dark:border-zinc-800">
                                Output {p.label}
                            </div>
                            <div className="text-xl font-bold leading-relaxed text-zinc-900 dark:text-zinc-100 bg-zinc-50/50 dark:bg-zinc-900/20 p-8 rounded-3xl border border-zinc-100 dark:border-zinc-800/50 shadow-soft">
                                {p.answer}
                            </div>
                        </div>

                        {p.workings && (
                            <div className="space-y-6">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                                    <ChevronRight className="h-3 w-3 text-zinc-300" /> Derivation Path
                                </span>
                                <div className="text-sm text-muted-foreground/90 leading-[1.8] bg-zinc-50/30 dark:bg-zinc-900/10 p-10 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800/40 font-medium font-inter">
                                    {p.workings.split('\n').map((line: string, lIdx: number) => (
                                        <p key={lIdx} className="mb-4 last:mb-0">{line}</p>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                </div>
            </div>
            {qIdx < questions.length - 1 && <Separator className="opacity-30" />}
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <div className="text-lg leading-relaxed whitespace-pre-wrap font-inter text-foreground/80 glass-card p-10 rounded-3xl border-white/5 text-center">
        <Bot className="h-10 w-10 mx-auto text-zinc-200 mb-4" />
        No structured synthesis data available for this document.
    </div>
  );
};

export function UploadDetails() {
  const { uploadId } = useParams<{ uploadId: string }>();
  const navigate = useNavigate();
  const [upload, setUpload] = useState<Upload | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (uploadId) {
      fetchUploadDetails();
    }
  }, [uploadId]);

  const fetchUploadDetails = async () => {
    try {
      const response = await api.get<{ upload: Upload }>(`/upload/${uploadId}`);
      setUpload(response.data.upload);
    } catch (err) {
      setApiError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!uploadId) return;
    setAnalyzing(true);
    setApiError('');

    try {
      await api.post(`/analyze/${uploadId}`);
      fetchUploadDetails();
      
      const interval = setInterval(async () => {
        const res = await api.get<{ upload: Upload }>(`/upload/${uploadId}`);
        const currentAnalysis = res.data.upload.analyses?.[0];
        const status = currentAnalysis?.status; 
        
        if (status === 'completed' || status === 'failed') {
          clearInterval(interval);
          setUpload(res.data.upload);
          setAnalyzing(false);
        } else if (currentAnalysis?.status === 'running') {
          setUpload(res.data.upload);
        }
      }, 3000);

    } catch (err) {
      setApiError(handleApiError(err));
      setAnalyzing(false);
    }
  };


  const handleDownload = async () => {
    if (!analysis?.id) return;
    setDownloading(true);
    setApiError('');

    try {
      const response = await api.get<{ url: string }>(`/upload/${uploadId}/analyses/${analysis.id}/download`);
      window.open(response.data.url, '_blank');
    } catch (err) {
      setApiError(handleApiError(err));
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-48 space-y-6">
        <Loader2 className="h-10 w-10 animate-spin text-zinc-300 dark:text-zinc-700" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Synchronizing Synthesis</span>
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
            <p className="text-zinc-400 text-xs font-medium">We couldn't locate this specific document.</p>
        </div>
        <Button onClick={() => navigate('/dashboard')} variant="outline" className="rounded-xl">Back to Workspace</Button>
      </div>
    );
  }

  const analysis = upload.analyses?.[0];

  return (
    <div className="space-y-12">
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
            onClick={() => setApiError('')}
          >
             <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}

      {/* Header Meta */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-10 border-b border-zinc-100 dark:border-zinc-800/50">
        <div className="space-y-5">
           <button 
             onClick={() => navigate('/dashboard')}
             className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors group"
           >
             <ArrowLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
           </button>
           <div className="space-y-1">
              <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 truncate max-w-2xl leading-tight">
                {upload.key.split('/').pop()?.replace(/_\d+\.pdf$/, '.pdf')}
              </h1>
              <div className="flex items-center gap-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-2">
                 <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Ingested {new Date(upload.createdAt).toLocaleDateString()}</span>
                 <span className="opacity-20">•</span>
                 <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> {upload.size ? (upload.size / 1024 / 1024).toFixed(2) : '0'} MB</span>
              </div>
           </div>
        </div>

        <div className="flex items-center gap-3">
           {analysis?.status === 'completed' && (
              <Button 
                variant="outline" 
                onClick={handleDownload} 
                className="h-12 px-6 rounded-xl border-zinc-200 dark:border-zinc-800 text-xs font-bold uppercase tracking-widest gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-100/5 transition-all outline-none"
                disabled={downloading}
              >
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Export Synthesis
              </Button>
           )}
           {(!analysis || analysis.status === 'failed') && (
              <Button 
                onClick={handleAnalyze} 
                className="h-12 px-10 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold text-xs uppercase tracking-[0.1em] gap-3 hover:scale-[0.98] transition-all shadow-premium"
                disabled={analyzing}
              >
                {analyzing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Initiate Synthesis
              </Button>
           )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
         {/* Context Column - RAW extraction */}
         <aside className="lg:col-span-4 space-y-6">
            <div className="space-y-4">
               <div className="flex items-center gap-2">
                  <ScrollText className="h-3.5 w-3.5 text-zinc-400" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Context Extraction</h3>
               </div>
               
               <div className="min-h-[500px] max-h-[700px] overflow-hidden rounded-3xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 p-8 group relative">
                  <div className="h-full overflow-y-auto pr-2 scrollbar-hide text-[11px] leading-relaxed text-zinc-500 font-mono whitespace-pre-wrap selection:bg-zinc-200 dark:selection:bg-zinc-800">
                    {upload.parseResult ? (
                       upload.parseResult.text
                    ) : (
                       <div className="flex flex-col items-center justify-center h-[400px] text-center space-y-4 opacity-30">
                          <Search className="h-8 w-8" />
                          <p className="text-[10px] font-bold uppercase tracking-widest">Waiting for OCR parse</p>
                       </div>
                    )}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-zinc-50 dark:from-zinc-950 to-transparent pointer-events-none" />
               </div>
            </div>
         </aside>

         {/* Synthesis Column - Reader mode */}
         <main className="lg:col-span-8 space-y-8 min-h-[800px]">
            <div className="space-y-4">
               <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                     <Bot className="h-3.5 w-3.5 text-zinc-900 dark:text-zinc-100" />
                     <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Analysis Output</h3>
                  </div>
                  {analysis?.status === 'completed' && (
                     <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3" /> Synthesis Optimized
                     </div>
                  )}
               </div>

               <div className="min-h-[800px] rounded-[3rem] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black p-12 md:p-16 shadow-premium relative">
                   <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none rounded-[3rem]" />
                   
                   {!analysis ? (
                      <div className="flex flex-col items-center justify-center h-[600px] text-center space-y-8 text-foreground">
                         <div className="h-24 w-24 rounded-[2.5rem] bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-200">
                             <Sparkles className="h-12 w-12 animate-pulse" />
                         </div>
                         <div className="space-y-3">
                            <h3 className="text-3xl font-black tracking-tight">Neural Core Idle</h3>
                            <p className="text-zinc-400 text-sm font-medium max-w-[300px] leading-relaxed mx-auto italic">
                               Inert document ingested. Initiate neural synthesis to generate professional academic results.
                            </p>
                         </div>
                         <Button 
                            onClick={handleAnalyze} 
                            className="h-14 px-12 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold text-sm tracking-tight hover:scale-[0.98] transition-transform shadow-premium"
                            disabled={analyzing}
                          >
                            Generate Solution
                          </Button>
                      </div>
                   ) : analyzing ? (
                      <div className="flex flex-col items-center justify-center h-[600px] space-y-10">
                          <div className="relative">
                              <div className="absolute inset-0 blur-3xl bg-zinc-900/10 dark:bg-white/10 rounded-full animate-pulse" />
                              <RefreshCw className="h-16 w-16 text-zinc-300 dark:text-zinc-700 animate-spin relative" />
                          </div>
                          <div className="text-center space-y-2">
                             <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Synthesizing Neural Threads</p>
                             <h4 className="text-xl font-bold italic text-zinc-500">Compiling Report Layer...</h4>
                          </div>
                      </div>
                   ) : (
                      <div className="relative z-10 transition-all duration-700">
                         <MarkdownRenderer content={analysis.output as any} />
                      </div>
                   )}
               </div>
            </div>
         </main>
      </div>
    </div>
  );
}
