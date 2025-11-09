import React from 'react';
import BackgroundReportGenerator from '../components/reports/BackgroundReportGenerator';
import ReportQueue from '../components/reports/ReportQueue';

export default function ReportGenerator() {
  return (
    <div className="p-6 md:p-10 space-y-8 bg-gray-900 text-white min-h-screen">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">Report Generator</h1>
        <p className="text-lg text-gray-400">
          Create and manage complex, long-running reports in the background.
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3">
          <BackgroundReportGenerator />
        </div>
        <div className="lg:col-span-2">
          <ReportQueue />
        </div>
      </div>
    </div>
  );
}