import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from '@/components/ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { api, handleApiError } from '@/lib/api';
import type { Upload } from '@/lib/types';
import { 
  FileText, 
  Loader2, 
  Trash2, 
  ExternalLink,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

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
      
      const query = cursor ? `?cursor=${cursor}&limit=10` : `?limit=10`;
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
      setUploads(uploads.map(u => 
        u.uploadId === uploadId ? { ...u, status: 'processing' } : u
      ));
      await api.post(`/parse/${uploadId}`);
      await fetchUploads(); // Refresh list to get updates
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

      setUploads(prev => prev.map(u => 
        u.uploadId === uploadId ? { ...u, status: 'processing' } : u
      ));
      
      api.post(`/parse/${uploadId}`).then(() => {
        fetchUploads();
      }).catch(console.error);

      api.post(`/parse/${uploadId}`).then(() => {
        // Optimistic update or silent refresh could go here
        fetchUploads(); 
      }).catch(console.error);

      // Refresh list to show new upload
      await fetchUploads();
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = ''; 
    }
  };

  const handleDelete = async (uploadId: string) => {
    if (!confirm('Are you sure you want to delete this upload?')) return;

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
        return <Badge variant="warning" className="gap-1"><Clock className="h-3 w-3" /> {status}</Badge>;
      case 'processed':
      case 'completed':
        return <Badge variant="success" className="gap-1"><CheckCircle2 className="h-3 w-3" /> {status}</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> {status}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your homework documents and view AI analyses.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
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
            className="gap-2"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {uploading ? "Uploading..." : "New Document"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 text-sm font-medium text-destructive bg-destructive/5 rounded-lg border border-destructive/10">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid gap-6">
        <Card className="border-none shadow-sm bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl font-semibold">Recent Documents</CardTitle>
            <CardDescription>
              A list of your recently uploaded and processed homework files.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                <p className="text-sm text-muted-foreground">Loading documents...</p>
              </div>
            ) : uploads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No documents yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm mt-1">
                  Upload your first homework PDF to start getting AI-powered insights and solutions.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-6"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload your first file
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Document</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploads.map((upload) => (
                    <TableRow key={upload.uploadId}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
                            <FileText className="h-4 w-4" />
                          </div>
                          <span className="truncate max-w-[200px]" title={upload.key.split('/').pop()}>
                            {upload.key.split('/').pop()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(upload.status)}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(upload.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {upload.status === 'processed' ? (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 gap-1"
                              onClick={() => navigate(`/upload/${upload.uploadId}`)}
                            >
                              <ExternalLink className="h-3 w-3" /> View
                            </Button>
                          ) : upload.status === 'uploaded' ? (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 gap-1"
                              onClick={() => handleParse(upload.uploadId)}
                            >
                              <Loader2 className="h-3 w-3" /> Process
                            </Button>
                          ) : null}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(upload.uploadId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            
            {nextCursor && (
              <div className="flex justify-center mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => fetchUploads(nextCursor)}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading more...
                    </>
                  ) : (
                    'Load More'
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
