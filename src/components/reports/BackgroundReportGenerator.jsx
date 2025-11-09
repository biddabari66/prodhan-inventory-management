import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Play, Clock, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast, Toaster } from 'sonner';

export default function BackgroundReportGenerator() {
  const [reportType, setReportType] = useState('');
  const [fileFormat, setFileFormat] = useState('csv');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [emailNotification, setEmailNotification] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = async () => {
    if (!reportType) {
      toast.error('Please select a report type.');
      return;
    }
    setIsGenerating(true);
    
    // Simulate background task
    toast.info('Report generation started. You will be notified upon completion.');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setIsGenerating(false);
    toast.success('Report has been generated successfully and is available in the queue.');
    
    // Reset form
    setReportType('');
    setDateRange({ start: '', end: '' });
  };

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <Toaster />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl text-gray-100">
          <FileText className="w-6 h-6" />
          Generate New Report
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="report-type" className="text-gray-300">Report Type</Label>
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger id="report-type" className="bg-gray-700 border-gray-600 text-white">
              <SelectValue placeholder="Select a report to generate..." />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 text-white">
              <SelectItem value="full_financial_summary">Full Financial Summary</SelectItem>
              <SelectItem value="admission_by_source">Admission by Source</SelectItem>
              <SelectItem value="employee_performance">Employee Performance</SelectItem>
              <SelectItem value="inventory_turnover">Inventory Turnover</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start-date" className="text-gray-300">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date" className="text-gray-300">End Date</Label>
            <Input
              id="end-date"
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="file-format" className="text-gray-300">File Format</Label>
          <Select value={fileFormat} onValueChange={setFileFormat}>
            <SelectTrigger id="file-format" className="bg-gray-700 border-gray-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 text-white">
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="email-notification"
            checked={emailNotification}
            onCheckedChange={setEmailNotification}
          />
          <Label htmlFor="email-notification" className="text-gray-300">
            Send email notification on completion
          </Label>
        </div>

        <Alert variant="default" className="bg-amber-900/20 border-amber-500/30 text-amber-300">
          <AlertTriangle className="h-4 w-4 !text-amber-400" />
          <AlertTitle>Heads Up!</AlertTitle>
          <AlertDescription>
            Generating large reports may take several minutes. The process runs in the background.
          </AlertDescription>
        </Alert>

        <Button
          onClick={handleGenerateReport}
          disabled={isGenerating || !reportType}
          className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
        >
          {isGenerating ? (
            <Clock className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Play className="w-4 h-4 mr-2" />
          )}
          {isGenerating ? 'Generating...' : 'Start Report Generation'}
        </Button>
      </CardContent>
    </Card>
  );
}