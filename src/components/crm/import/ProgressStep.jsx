import React, { useState, useEffect } from 'react';
import { Lead } from '@/entities/Lead';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Upload } from 'lucide-react';

export default function ProgressStep({ data, campaignName, selectedCourse, onComplete }) {
  const [progress, setProgress] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imported, setImported] = useState(0);
  const [errors, setErrors] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    importLeads();
  }, []);

  const importLeads = async () => {
    const validLeads = data.filter(lead => lead.student_name && lead.phone);
    
    for (let i = 0; i < validLeads.length; i++) {
      try {
        const leadData = {
          ...validLeads[i],
          lead_source: 'csv_import',
          campaign_name: campaignName,
          imported_for_course: selectedCourse,
          course_interest: validLeads[i].course_interest || selectedCourse,
          lead_status: 'new'
        };

        await Lead.create(leadData);
        setImported(prev => prev + 1);
      } catch (error) {
        console.error('Error importing lead:', error);
        setErrors(prev => prev + 1);
      }

      setCurrentIndex(i + 1);
      setProgress(((i + 1) / validLeads.length) * 100);
      
      // Add small delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setIsComplete(true);
    setTimeout(onComplete, 1500); // Auto-close after completion
  };

  const validLeads = data.filter(lead => lead.student_name && lead.phone);

  return (
    <div className="p-4 space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Importing Leads...</h3>
        <p className="text-sm text-muted-foreground">
          Please wait while we import your leads.
        </p>
      </div>

      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Import Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progress} className="h-2" />
          <div className="text-center text-sm text-muted-foreground">
            {isComplete ? 'Import Complete!' : `Processing lead ${currentIndex} of ${validLeads.length}...`}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="premium-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{validLeads.length}</div>
            <p className="text-xs text-muted-foreground">Total to Import</p>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{imported}</div>
            <p className="text-xs text-muted-foreground">Successfully Imported</p>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{errors}</div>
            <p className="text-xs text-muted-foreground">Errors</p>
          </CardContent>
        </Card>
      </div>

      {isComplete && (
        <Card className="premium-card border-green-200 bg-green-50">
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <h4 className="font-semibold text-green-800">Import Successful!</h4>
            <p className="text-sm text-green-600">
              Campaign: {campaignName} | Course: {selectedCourse}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}