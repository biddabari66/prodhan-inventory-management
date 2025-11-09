import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, Clock, CheckCircle, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const initialReports = [
  { id: 1, name: 'Q4 Financial Summary', format: 'PDF', status: 'completed', timestamp: new Date(Date.now() - 1000 * 60 * 5) },
  { id: 2, name: 'Admission Source Analysis', format: 'XLSX', status: 'processing', timestamp: new Date() },
  { id: 3, name: 'Inventory Stocktake', format: 'CSV', status: 'queued', timestamp: new Date() },
];

export default function ReportQueue() {
  const [reports, setReports] = useState(initialReports);
  const [isLoading, setIsLoading] = useState(false);

  const refreshQueue = () => {
    setIsLoading(true);
    // Simulate fetching updated queue status
    setTimeout(() => {
      setReports(prev => prev.map(r => 
        r.status === 'processing' ? { ...r, status: 'completed' } : 
        r.status === 'queued' ? { ...r, status: 'processing', timestamp: new Date() } : r
      ));
      setIsLoading(false);
    }, 1500);
  };
  
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate status updates
      setReports(prev => prev.map(r => {
        if (r.status === 'processing' && Math.random() > 0.7) {
          return { ...r, status: 'completed', timestamp: new Date() };
        }
        if (r.status === 'queued' && Math.random() > 0.5) {
          return { ...r, status: 'processing', timestamp: new Date() };
        }
        return r;
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'processing': return <Clock className="w-5 h-5 text-blue-400 animate-spin" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-400" />;
      case 'queued': return <Clock className="w-5 h-5 text-gray-400" />;
      default: return null;
    }
  };

  return (
    <Card className="bg-gray-800/50 border-gray-700 h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl text-gray-100">Report Queue</CardTitle>
        <Button variant="ghost" size="sm" onClick={refreshQueue} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {reports.map(report => (
            <div key={report.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(report.status)}
                <div>
                  <p className="font-medium text-gray-200">{report.name}</p>
                  <p className="text-xs text-gray-400">
                    {formatDistanceToNow(report.timestamp, { addSuffix: true })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-gray-300 border-gray-600">{report.format}</Badge>
                {report.status === 'completed' && (
                  <Button variant="ghost" size="sm">
                    <Download className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}