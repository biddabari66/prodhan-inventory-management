import React from 'react';
import { FileCog } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import BackgroundReportGenerator from '../components/reports/BackgroundReportGenerator';
import ReportQueue from '../components/reports/ReportQueue';

export default function ReportGenerator() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        icon={FileCog}
        title="Report Generator"
        subtitle="Create and manage complex, long-running reports in the background"
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
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
