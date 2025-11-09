import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Stepper, Step } from '@/components/ui/stepper';
import UploadStep from './import/UploadStep';
import MappingStep from './import/MappingStep';
import ReviewStep from './import/ReviewStep';
import ProgressStep from './import/ProgressStep';
import { Lead } from '@/entities/Lead';

export default function LeadImportDialog({ isOpen, onClose, onImportComplete }) {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [mappedData, setMappedData] = useState([]);
  const [fieldMapping, setFieldMapping] = useState({});
  const [campaignName, setCampaignName] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');

  const leadFields = Object.keys(Lead.schema().properties);

  const handleFileAccepted = (acceptedFile, data, campaign, course) => {
    setFile(acceptedFile);
    setParsedData(data);
    setCampaignName(campaign);
    setSelectedCourse(course);
    setStep(1);
  };

  const handleMappingConfirmed = (data, mapping) => {
    setMappedData(data);
    setFieldMapping(mapping);
    setStep(2);
  };

  const handleReviewConfirmed = () => {
    setStep(3);
  };
  
  const handleClose = () => {
    setStep(0);
    setFile(null);
    setParsedData([]);
    setMappedData([]);
    setCampaignName('');
    setSelectedCourse('');
    onClose();
    onImportComplete();
  };

  const steps = [
    { label: "Upload & Tag" },
    { label: "Map Fields" },
    { label: "Review" },
    { label: "Import" }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Leads from CSV</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <Stepper initialStep={0} activeStep={step} steps={steps.map(s => ({label: s.label}))} />
        </div>
        <div className="flex-grow overflow-y-auto p-1">
          {step === 0 && <UploadStep onFileAccepted={handleFileAccepted} />}
          {step === 1 && <MappingStep csvHeaders={Object.keys(parsedData[0] || {})} leadFields={leadFields} onConfirm={handleMappingConfirmed} data={parsedData} />}
          {step === 2 && <ReviewStep data={mappedData} onConfirm={handleReviewConfirmed} onBack={() => setStep(1)} />}
          {step === 3 && <ProgressStep data={mappedData} campaignName={campaignName} selectedCourse={selectedCourse} onComplete={handleClose} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}