import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent 
} from '@/components/ui/Card';
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
  Layers
} from 'lucide-react';
import { motion } from 'framer-motion';

const MarkdownRenderer = ({ content }: { content: AnalysisOutput }) => {
  if (!content) return null;
  
  if (content.type === 'assignment' && content.assignment) {
    const { assignment } = content;
    return (
      <div className="space-y-16 pb-20">
        <header className="space-y-4 text-center border-b border-border/10 pb-12">
          <Badge variant="outline" className="px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-bold text-primary border-primary/20 bg-primary/5">
             Full Analysis Report
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
                  <div className="h-10 w-10 rounded-full border border-border flex items-center justify-center font-bold text-xs text-muted-foreground bg-background self-start">
                     {idx + 1}
                  </div>
                  <div className="w-px h-full bg-gradient-to-b from-border/50 to-transparent" />
              </div>

              <div className="space-y-8">
                <div className="space-y-2">
                    <h2 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
                        {assignment.blueprint?.sections?.find(s => s.id === section.section_id)?.title || `Chapter ${idx + 1}`}
                    </h2>
                    <div className="h-1.5 w-24 bg-primary rounded-full" />
                </div>

                <div className="prose prose-lg dark:prose-invert max-w-none text-foreground/80 leading-relaxed font-inter">
                  {section.content.split('\n').map((para: string, pIdx: number) => (
                    para.trim() ? <p key={pIdx} className="mb-6">{para}</p> : null
                  ))}
                </div>

                {section.citations && section.citations.length > 0 && (
                  <div className="mt-12 p-8 glass-card rounded-3xl border-white/5 bg-primary/[0.02]">
                    <h4 className="text-xs font-black uppercase tracking-[0.15em] text-primary mb-4 flex items-center gap-2">
                      <BookOpenCheck className="h-4 w-4" /> Academic Sources
                    </h4>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {section.citations.map((c, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground/90 bg-background/40 p-3 rounded-xl border border-border/40">
                           <span className="text-primary font-bold">[{i+1}]</span>
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

  if (content.type === 'homework' && content.questions) {
    return (
      <div className="space-y-12">
        {content.questions.map((q, qIdx: number) => (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: qIdx * 0.1 }}
            key={q.qid} 
            className="group glass-card rounded-[2.5rem] p-8 md:p-10 border-white/5 hover:border-primary/20 transition-all duration-500"
          >
            <div className="space-y-8">
                <div className="flex items-start gap-5">
                    <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-2xl bg-primary text-primary-foreground font-black text-lg shadow-lg shadow-primary/20 rotate-3 group-hover:rotate-0 transition-transform">
                        {q.qid.replace(/Q/i, '')}
                    </div>
                    <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary opacity-70">Question {q.qid}</span>
                        <h3 className="text-xl md:text-2xl font-bold leading-tight text-foreground">
                            {q.question_text}
                        </h3>
                    </div>
                </div>
                
                <div className="space-y-10 pl-2 md:pl-6 border-l-2 border-primary/10 ml-6 md:ml-12 pt-2">
                {q.parts?.map((p, idx: number) => (
                    <div key={idx} className="space-y-6 relative">
                        <div className="absolute -left-[33px] md:-left-[49px] top-6 w-4 h-4 rounded-full bg-background border-4 border-primary shadow-sm" />
                        
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                                Solution Path {p.label}
                            </div>
                            <div className="text-lg font-bold leading-relaxed text-foreground/90 bg-emerald-500/[0.03] p-6 rounded-3xl border border-emerald-500/10 shadow-inner">
                                {p.answer}
                            </div>
                        </div>

                        {p.workings && (
                            <div className="space-y-4">
                                <span className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground/60 flex items-center gap-2 mb-2">
                                    <ChevronRight className="h-3 w-3 text-primary" /> Comprehensive Working
                                </span>
                                <div className="text-[15px] text-muted-foreground/90 leading-[1.8] bg-muted/20 p-8 rounded-[2rem] border border-border/40 font-medium">
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
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <div className="text-lg leading-relaxed whitespace-pre-wrap font-inter text-foreground/80 glass-card p-10 rounded-3xl border-white/5">
        No structured content found for this analysis.
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
  const [error, setError] = useState('');

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
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!uploadId) return;
    setAnalyzing(true);
    setError('');

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
      setError(handleApiError(err));
      setAnalyzing(false);
    }
  };

  const handleDownload = async () => {
    if (!analysis?.id) return;
    setDownloading(true);
    setError('');

    try {
      const response = await api.get<{ url: string }>(`/upload/${uploadId}/analyses/${analysis.id}/download`);
      window.open(response.data.url, '_blank');
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-8 text-center">
        <div className="relative">
            <div className="absolute inset-0 blur-3xl bg-primary/20 rounded-full animate-pulse" />
            <Loader2 className="h-16 w-16 animate-spin text-primary relative" />
        </div>
        <div className="space-y-2">
            <h2 className="text-2xl font-bold">Synchronizing Knowledge...</h2>
            <p className="text-muted-foreground">Preparing your document and analysis workspace</p>
        </div>
      </div>
    );
  }

  if (!upload) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="h-20 w-20 rounded-3xl bg-rose-500/10 flex items-center justify-center">
            <AlertCircle className="h-10 w-10 text-rose-500" />
        </div>
        <div className="text-center space-y-2">
            <h3 className="text-2xl font-bold">Document Misplaced</h3>
            <p className="text-muted-foreground">We couldn't find the resource you're looking for.</p>
        </div>
        <Button 
            variant="outline" 
            size="lg"
            className="rounded-2xl h-12 px-8 border-border hover:bg-muted"
            onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Return to Overview
        </Button>
      </div>
    );
  }

  const analysis = upload.analyses?.[0];

  return (
    <div className="space-y-12 max-w-[1400px] mx-auto overflow-visible">
      {/* Dynamic Header Action Bar */}
      <div className="sticky top-4 z-30 glass-card p-4 md:p-6 rounded-[2rem] border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center gap-6">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-12 w-12 rounded-2xl bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all flex-shrink-0"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="space-y-1 overflow-hidden">
            <div className="flex items-center gap-3">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight truncate max-w-[250px] md:max-w-md">
                {upload.key.split('/').pop()?.replace(/_\d+\.pdf$/, '.pdf')}
              </h1>
              <div className="flex-shrink-0">
                  {upload.status === 'processed' ? (
                    <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-3 font-black text-[10px] uppercase tracking-widest">Active</Badge>
                  ) : (
                    <Badge variant="warning" className="bg-amber-500/10 text-amber-500 border-amber-500/20 px-3 font-black text-[10px] uppercase tracking-widest">{upload.status}</Badge>
                  )}
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">
               <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {new Date(upload.createdAt).toLocaleDateString()}</span>
               <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> {upload.size ? (upload.size / 1024 / 1024).toFixed(2) : '0'} MB</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {analysis?.status === 'completed' && (
            <Button 
              variant="outline" 
              onClick={handleDownload} 
              disabled={downloading}
              className="h-12 px-6 rounded-2xl border-white/10 hover:bg-primary/5 hover:border-primary/30 transition-all font-bold group"
            >
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 mr-2 transition-transform group-hover:translate-y-0.5" />}
              Export Report
            </Button>
          )}
          
          {(!analysis || analysis.status === 'failed') && (
            <Button 
              onClick={handleAnalyze} 
              disabled={analyzing}
              size="lg"
              className="h-12 px-8 rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/20 font-black tracking-wide"
            >
              {analyzing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {analyzing ? 'Analyzing...' : 'Generate Solution'}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-4 p-5 bg-rose-500/5 border border-rose-500/20 rounded-3xl text-rose-500"
        >
          <AlertCircle className="h-6 w-6" />
          <p className="font-bold flex-1">{error}</p>
          <Button variant="ghost" size="sm" className="hover:bg-rose-500/10 rounded-xl" onClick={() => setError('')}>Dismiss</Button>
        </motion.div>
      )}

      {/* Workspace Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-start pb-20">
        
        {/* Document Context Sidebar */}
        <aside className="xl:col-span-4 space-y-8 sticky top-32">
          <Card className="glass-card rounded-[2.5rem] border-white/5 shadow-none overflow-hidden">
            <CardHeader className="pb-4 px-8 pt-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:rotate-12 transition-all">
                        <ScrollText className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg font-black uppercase tracking-widest text-foreground/70">Context</CardTitle>
                </div>
                {upload.parseResult?.text && (
                    <Badge variant="outline" className="text-[10px] font-bold border-border/10 bg-muted/50 rounded-lg">
                        RAW TXT
                    </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <div className="relative rounded-[1.5rem] bg-background/30 border border-border/5 group h-[600px]">
                <div className="prose prose-sm max-w-none text-muted-foreground/80 h-full overflow-y-auto px-6 py-8 scrollbar-hide font-mono text-[13px] leading-relaxed">
                  {upload.parseResult?.text ? (
                    <p className="whitespace-pre-wrap">
                      {upload.parseResult.text}
                    </p>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                      <div className="h-16 w-16 rounded-full bg-muted/5 flex items-center justify-center border border-dashed border-border/20">
                         <Search className="h-8 w-8 text-muted-foreground/20" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground/40 italic">Waiting for text extraction...</p>
                    </div>
                  )}
                </div>
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/80 to-transparent rounded-b-[1.5rem] pointer-events-none" />
              </div>
            </CardContent>
          </Card>

          <div className="px-6 flex items-center gap-4">
              <div className="h-3 w-3 rounded-full bg-primary/60 blur-[2px]" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/50">End of Source Material</p>
          </div>
        </aside>

        {/* AI Research Space */}
        <main className="xl:col-span-8 space-y-8 min-h-[800px]">
          <div className="glass-card rounded-[3rem] border-white/5 bg-card/10 overflow-hidden min-h-full transition-all">
            <div className="h-2 bg-gradient-to-r from-primary/10 via-primary to-primary/10 opacity-30" />
            
            <div className="p-8 md:p-12">
              {analyzing ? (
                <div className="flex flex-col items-center justify-center py-40 space-y-10 text-center">
                    <div className="relative">
                        <div className="absolute inset-0 blur-3xl bg-primary/20 rounded-full animate-pulse" />
                        <div className="h-24 w-24 rounded-[2rem] bg-primary flex items-center justify-center shadow-[0_20px_50px_rgba(249,115,22,0.3)] relative">
                             <Bot className="h-12 w-12 text-white animate-bounce" />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <h3 className="text-3xl font-black tracking-tight text-gradient">AI Researcher Active</h3>
                        <p className="text-muted-foreground text-lg max-w-sm mx-auto leading-relaxed">
                        Deconstructing your assignment and deriving high-fidelity academic solutions...
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-50">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        Processing Neural Threads
                    </div>
                </div>
              ) : analysis ? (
                <div className="space-y-12">
                  <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-8">
                     <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                           <Bot className="h-5 w-5" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-foreground/60">Research Hub v2.1</span>
                     </div>
                     <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 border-none px-4 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3" /> Fully Derived
                     </Badge>
                  </div>

                  {analysis.status === 'completed' && analysis.output ? (
                    <MarkdownRenderer content={analysis.output} />
                  ) : analysis.status === 'failed' ? (
                    <div className="flex flex-col items-center text-center py-40 space-y-6">
                      <div className="h-20 w-20 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                        <AlertCircle className="h-10 w-10 text-rose-500" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-2xl font-bold">Research Interrupted</h4>
                        <p className="text-muted-foreground max-w-xs mx-auto">
                          Our neural network encountered an unexpected obstacle.
                        </p>
                      </div>
                      <Button 
                        onClick={handleAnalyze}
                        className="rounded-2xl h-12 px-8 bg-background border border-border hover:bg-muted text-foreground transition-all"
                      >
                         Re-initialize Research
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-40 space-y-6">
                        <RefreshCw className="h-12 w-12 text-primary/40 animate-spin" />
                        <div className="text-center space-y-2">
                            <p className="text-lg font-bold text-gradient">Compiling Final Report</p>
                            <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground opacity-50">Structuring Data • 98%</p>
                        </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-44 text-center space-y-10">
                    <div className="h-32 w-32 rounded-[2.5rem] bg-muted/20 border-2 border-dashed border-muted-foreground/20 flex items-center justify-center group">
                        <Sparkles className="h-12 w-12 text-muted-foreground/30 group-hover:text-primary transition-colors duration-500" />
                    </div>
                    <div className="space-y-3">
                        <h3 className="text-3xl font-black tracking-tight text-foreground/40">Ready to Begin</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed text-lg">
                        This document is primed for academic exploration. Click below to start the analysis.
                        </p>
                    </div>
                    <Button 
                        onClick={handleAnalyze} 
                        size="lg"
                        className="h-16 px-12 rounded-3xl bg-primary text-primary-foreground font-black text-lg shadow-[0_20px_50px_rgba(249,115,22,0.3)] hover:scale-105 transition-all group"
                    >
                        Initialize AI Solution
                        <ChevronRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </div>
              )}
            </div>

            {analysis?.status === 'completed' && (
                <div className="p-8 mt-auto border-t border-white/5 bg-primary/[0.01]">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                <CheckCircle2 className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm font-bold">Research Verified</p>
                                <p className="text-xs text-muted-foreground">Analysis synchronized with latest GPT models.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" className="rounded-xl text-xs font-bold uppercase tracking-widest text-muted-foreground">Feedback</Button>
                            <Button variant="ghost" size="sm" className="rounded-xl text-xs font-bold uppercase tracking-widest text-primary bg-primary/5">Share Hub</Button>
                        </div>
                    </div>
                </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

