import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileIcon } from 'lucide-react';

// Simple CSV parser function
const parseCSV = (text) => {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      data.push(row);
    }
  }
  
  return data;
};

export default function UploadStep({ onFileAccepted }) {
  const [file, setFile] = useState(null);
  const [campaignName, setCampaignName] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setError('');
    } else {
      setFile(null);
      if (selectedFile) {
        setError('Invalid file type. Please upload a valid CSV file.');
      }
    }
  };

  const handleContinue = async () => {
    if (!file) {
      setError('Please upload a file.');
      return;
    }
    if (!campaignName) {
      setError('Please provide a campaign name for this import.');
      return;
    }
    if (!selectedCourse) {
      setError('Please enter a course name for this import.');
      return;
    }

    setIsProcessing(true);
    try {
      const text = await file.text();
      const parsedData = parseCSV(text);
      
      if (parsedData.length === 0) {
        setError('CSV file appears to be empty or invalid.');
        setIsProcessing(false);
        return;
      }
      
      onFileAccepted(file, parsedData, campaignName, selectedCourse);
    } catch (err) {
      setError('Error reading CSV file. Please check the file format.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="space-y-2">
        <Label htmlFor="campaignName">Campaign Name</Label>
        <Input 
          id="campaignName"
          placeholder="e.g., 'Ramadan Offer Batch 1'"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Give this import batch a unique name for tracking.</p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="courseName">Import Leads For Course</Label>
        <Input 
          id="courseName"
          placeholder="e.g., 'BCS Foundation Course'"
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Tag all leads in this file with a primary course.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="csv-upload">Upload CSV File</Label>
        <Input
          id="csv-upload"
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
        />
        {file && (
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <FileIcon className="w-4 h-4" />
            <span>Selected file: <span className="font-medium">{file.name}</span></span>
          </div>
        )}
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex justify-end">
        <Button 
          onClick={handleContinue} 
          disabled={!file || !campaignName || !selectedCourse || isProcessing}
        >
          {isProcessing ? 'Processing...' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}