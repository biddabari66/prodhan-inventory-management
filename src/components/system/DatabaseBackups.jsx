import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Download, Play, Loader2, FileDown, CheckCircle2, XCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/api/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function DatabaseBackups() {
  const queryClient = useQueryClient();
  const [isTriggering, setIsTriggering] = useState(false);

  const { data: backups, isLoading } = useQuery({
    queryKey: ['system-backups'],
    queryFn: async () => {
      const res = await api.get('/system/backups');
      return res.data?.data || [];
    },
    refetchInterval: 10000 // poll every 10s to see backup status updates
  });

  const triggerMutation = useMutation({
    mutationFn: () => api.post('/system/backups'),
    onSuccess: () => {
      toast.success('Backup triggered successfully. It will be ready in a few moments.');
      queryClient.invalidateQueries({ queryKey: ['system-backups'] });
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error || 'Failed to trigger backup');
    },
    onSettled: () => setIsTriggering(false)
  });

  const handleTrigger = () => {
    setIsTriggering(true);
    triggerMutation.mutate();
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              Automated Database Backups
            </CardTitle>
            <CardDescription>
              Manage and download your daily system backups. Backups automatically run every night.
            </CardDescription>
          </div>
          <Button 
            onClick={handleTrigger} 
            disabled={isTriggering}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isTriggering ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
            Trigger Manual Backup
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : backups?.length === 0 ? (
          <div className="text-center py-8 text-slate-500 border border-dashed rounded-lg bg-slate-50">
            <Database className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-50" />
            <p>No backups available yet.</p>
            <p className="text-sm">Trigger a manual backup to generate your first snapshot.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {backups?.map((backup) => (
              <div key={backup.id} className="flex items-center justify-between p-4 border rounded-xl bg-white shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${backup.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-600' : backup.status === 'FAILED' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800">{backup.filename}</h4>
                    <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                      <span>{formatDistanceToNow(new Date(backup.createdAt), { addSuffix: true })}</span>
                      <span>•</span>
                      <span>{formatSize(backup.sizeBytes)}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-medium">
                        {backup.status === 'SUCCESS' && <><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Completed</>}
                        {backup.status === 'PENDING' && <><Loader2 className="w-3 h-3 text-amber-500 animate-spin" /> In Progress...</>}
                        {backup.status === 'FAILED' && <><XCircle className="w-3 h-3 text-red-500" /> Failed</>}
                      </span>
                    </div>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  disabled={backup.status !== 'SUCCESS' || !backup.url}
                  onClick={() => window.open(api.defaults.baseURL.replace('/api/v1', '') + backup.url, '_blank')}
                  className="hover:bg-slate-50"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
