import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { api, handleApiError } from '@/lib/api';
import type { Upload } from '@/lib/types';
import { 
  FileText, 
  ArrowLeft, 
  Bot, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Search,
  Loader2,
  Download
} from 'lucide-react';

const MarkdownRenderer = ({ content }: { content: any }) => {
  if (!content) return null;
  
  if (content.type === 'assignment' && content.assignment) {
    const { assignment } = content;
    return (
      <div className="space-y-12 pb-20">
        <div className="space-y-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            {assignment.title}
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {assignment.blueprint?.description}
          </p>
        </div>

        <div className="space-y-10">
          {assignment.sections?.map((section: any, idx: number) => (
            <div key={section.section_id || idx} className="space-y-4 pt-6 border-t border-border/60">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-1 rounded">
                  Section {idx + 1}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                {assignment.blueprint?.sections?.find((s: any) => s.id === section.section_id)?.title || `Chapter ${idx + 1}`}
              </h2>
              <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 leading-loose whitespace-pre-wrap">
                {section.content}
              </div>
              {section.citations?.length > 0 && (
                <div className="mt-4 p-4 bg-muted/20 rounded-lg border border-border/40">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Sources & Citations</h4>
                  <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                    {section.citations.map((c: any, i: number) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if ((typeof content === 'object' && content.questions) || content.type === 'homework') {
    return (
      <div className="space-y-8">
        {content.questions.map((q: any) => (
          <div key={q.qid} className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                {q.qid}
              </span>
              <h3 className="text-base font-semibold pt-1 leading-snug text-foreground">
                {q.question_text}
              </h3>
            </div>
            
            <div className="ml-11 space-y-6">
              {q.parts?.map((p: any, idx: number) => (
                <div key={idx} className="relative pl-6 border-l-2 border-primary/20 space-y-3">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary border-4 border-background" />
                  
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary/70">
                      Part {p.label}
                    </span>
                    <div className="text-sm font-medium p-3 bg-primary/5 rounded-lg border border-primary/10">
                      <span className="text-primary font-bold mr-2">Answer:</span> {p.answer}
                    </div>
                  </div>

                  {p.workings && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
                        <ChevronRight className="h-3 w-3" /> Step-by-Step Explanation
                      </span>
                      <div className="text-sm text-muted-foreground leading-relaxed bg-muted/30 p-4 rounded-lg italic border border-border/40">
                        {p.workings}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (typeof content === 'object') {
    return (
      <div className="space-y-6">
        {Object.entries(content).map(([key, value]: [string, any]) => (
          <div key={key} className="space-y-2">
            <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-2">
              <ChevronRight className="h-3 w-3 text-primary" />
              {key.replace(/_/g, ' ')}
            </h4>
            <div className="text-sm leading-relaxed text-foreground bg-muted/30 p-4 rounded-lg border border-border/40 whitespace-pre-wrap">
              {typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <div className="text-sm leading-relaxed whitespace-pre-wrap">{content}</div>;
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
      await fetchUploadDetails();
      
      const interval = setInterval(async () => {
        const res = await api.get<{ upload: Upload }>(`/upload/${uploadId}`);
        const currentAnalysis = res.data.upload.analyses?.[0];
        const status = currentAnalysis?.status; 
        
        if (status === 'completed' || status === 'failed') {
          clearInterval(interval);
          setUpload(res.data.upload);
          setAnalyzing(false);
        } else if (currentAnalysis?.output) {
          setUpload(res.data.upload);
        }
      }, 2000);

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
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
        <p className="text-sm text-muted-foreground">Loading analysis details...</p>
      </div>
    );
  }

  if (!upload) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive/50" />
        <h3 className="text-lg font-medium">Document not found</h3>
        <Button variant="outline" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  const analysis = upload.analyses?.[0];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 -ml-2 text-muted-foreground hover:text-primary"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{upload.key.split('/').pop()}</h1>
            {upload.status === 'processed' ? (
              <Badge variant="success">Processed</Badge>
            ) : (
              <Badge variant="warning">{upload.status}</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Uploaded on {new Date(upload.createdAt).toLocaleDateString()} {upload.size ? `• ${(upload.size / 1024 / 1024).toFixed(2)} MB` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {analysis?.status === 'completed' && (
            <Button 
              variant="outline" 
              onClick={handleDownload} 
              disabled={downloading}
              className="gap-2"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export PDF
            </Button>
          )}
          {(!analysis || analysis.status === 'failed') && (
            <Button 
              onClick={handleAnalyze} 
              disabled={analyzing}
              className="gap-2 bg-primary shadow-lg shadow-primary/20"
            >
              {analyzing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {analyzing ? 'Analyzing...' : 'Generate AI Solution'}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm font-medium">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-12 xl:col-span-5 border-none shadow-sm h-fit">
          <CardHeader className="pb-3 box-border">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                <FileText className="h-4 w-4" />
              </div>
              <CardTitle className="text-lg">Extracted Text</CardTitle>
            </div>
            <CardDescription>
              Raw content extracted from your PDF document.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative rounded-lg bg-muted/40 border p-4 group">
              <div className="prose prose-sm max-w-none text-muted-foreground max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20">
                {upload.parseResult?.text ? (
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {upload.parseResult.text}
                  </p>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Search className="h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="italic text-muted-foreground/60">No text content extracted yet.</p>
                  </div>
                )}
              </div>
              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-muted/40 to-transparent rounded-b-lg pointer-events-none" />
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-12 xl:col-span-7 space-y-6">
          <Card className="border-none shadow-md bg-card overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                    <Bot className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-xl">AI Solution</CardTitle>
                </div>
                {analysis && (
                  <Badge variant={analysis.status === 'completed' ? 'success' : 'warning'}>
                    {analysis.status === 'completed' ? 'Completed' : 'Processing'}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {analyzing ? (
                <div className="flex flex-col items-center justify-center py-24 space-y-6 text-center">
                  <div className="relative">
                    <div className="absolute inset-0 blur-2xl bg-primary/20 rounded-full animate-pulse" />
                    <Bot className="h-16 w-16 text-primary relative animate-bounce" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">AI is hard at work</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                      Parsing symbols, solving problems, and generating step-by-step explanations...
                    </p>
                  </div>
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              ) : analysis ? (
                <div className="space-y-6">
                  {analysis.status === 'completed' && analysis.output ? (
                    <MarkdownRenderer content={analysis.output} />
                  ) : analysis.status === 'failed' ? (
                    <div className="flex flex-col items-center text-center py-12 space-y-4">
                      <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                        <AlertCircle className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-semibold">Analysis Failed</h4>
                        <p className="text-sm text-muted-foreground">
                          Something went wrong during the AI analysis. Please try again.
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleAnalyze}>
                        Try Again
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                      <RefreshCw className="h-12 w-12 text-primary/20 animate-spin mb-4" />
                      <p className="text-sm text-muted-foreground font-medium">Finalizing results...</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
                  <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                    <Sparkles className="h-8 w-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Ready for Analysis</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                      Get instant step-by-step solutions and explanations powered by Gemini.
                    </p>
                  </div>
                  <Button onClick={handleAnalyze} className="mt-4 shadow-lg shadow-primary/20">
                    Generate Solution
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          {analysis?.status === 'completed' && (
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <p className="text-sm font-medium">AI analysis is complete and verified.</p>
              </div>
              <Button variant="ghost" size="sm" className="h-8 text-xs underline font-normal">
                Report Issue
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
