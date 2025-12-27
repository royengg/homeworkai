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
  Loader2
} from 'lucide-react';

const MarkdownRenderer = ({ content }: { content: any }) => {
  if (!content) return null;
  
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
        const status = res.data.upload.analyses?.[0]?.status; 
        
        if (status === 'completed' || status === 'failed') {
          clearInterval(interval);
          setUpload(res.data.upload);
          setAnalyzing(false);
        }
      }, 2000);

    } catch (err) {
      setError(handleApiError(err));
      setAnalyzing(false);
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
