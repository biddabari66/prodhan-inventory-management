import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { ExtractDataFromUploadedFile, UploadFile } from '@/integrations/Core';
import { Admission } from '@/entities/Admission';

export default function AdmissionImportDialog({ isOpen, onClose, onImportComplete, employees }) {
  const [step, setStep] = useState('upload'); // upload, preview, importing, complete
  const [file, setFile] = useState(null);
  const [extractedData, setExtractedData] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResults, setImportResults] = useState(null);

  const handleFileUpload = async (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv') && !selectedFile.name.endsWith('.xlsx')) {
      alert('Please select a CSV or Excel file.');
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);

    try {
      // Upload file first
      const { file_url } = await UploadFile({ file: selectedFile });

      // Extract data using AI
      const extractionSchema = {
        type: "array",
        items: {
          type: "object",
          properties: {
            student_name: { type: "string" },
            student_phone: { type: "string" },
            student_email: { type: "string" },
            course_type: { type: "string" },
            course_name: { type: "string" },
            package_type: { type: "string" },
            admission_fee: { type: "number" },
            payment_method: { type: "string" },
            payment_status: { type: "string" },
            admission_date: { type: "string" },
            assigned_employee: { type: "string" },
            referral_source: { type: "string" },
            student_address: { type: "string" },
            guardian_name: { type: "string" },
            guardian_phone: { type: "string" }
          }
        }
      };

      const result = await ExtractDataFromUploadedFile({
        file_url,
        json_schema: extractionSchema
      });

      if (result.status === 'success') {
        setExtractedData(result.output || []);
        setStep('preview');
      } else {
        throw new Error(result.details || 'Failed to extract data');
      }
    } catch (error) {
      console.error('File processing error:', error);
      alert('Error processing file: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    setStep('importing');
    setIsProcessing(true);

    const results = { successful: 0, failed: 0, errors: [] };

    for (const data of extractedData) {
      try {
        // Find employee by name if provided
        let assignedEmployee = null;
        if (data.assigned_employee) {
          const employee = employees.find(emp => 
            emp.full_name.toLowerCase().includes(data.assigned_employee.toLowerCase())
          );
          assignedEmployee = employee?.id;
        }

        // Clean and validate data
        const admissionData = {
          student_name: data.student_name || '',
          student_phone: data.student_phone || '',
          student_email: data.student_email || '',
          course_type: data.course_type?.toLowerCase() || 'bcs',
          course_name: data.course_name || '',
          package_type: data.package_type?.toLowerCase() || 'basic',
          admission_fee: parseFloat(data.admission_fee) || 0,
          payment_method: data.payment_method?.toLowerCase() || 'cash',
          payment_status: data.payment_status?.toLowerCase() || 'pending',
          admission_date: data.admission_date || new Date().toISOString().slice(0, 10),
          assigned_employee: assignedEmployee,
          referral_source: data.referral_source?.toLowerCase() || 'website',
          student_address: data.student_address || '',
          guardian_name: data.guardian_name || '',
          guardian_phone: data.guardian_phone || '',
          admission_status: 'active'
        };

        await Admission.create(admissionData);
        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          student: data.student_name,
          error: error.message
        });
      }
    }

    setImportResults(results);
    setStep('complete');
    setIsProcessing(false);
  };

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setExtractedData([]);
    setImportResults(null);
    setIsProcessing(false);
    onClose();
    if (importResults?.successful > 0) {
      onImportComplete();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Admissions</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-6">
            <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
              <FileSpreadsheet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Upload Admission Data</h3>
              <p className="text-muted-foreground mb-4">
                Select a CSV or Excel file with admission data
              </p>
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileUpload}
                className="hidden"
                id="admission-file"
                disabled={isProcessing}
              />
              <Button 
                onClick={() => document.getElementById('admission-file').click()}
                disabled={isProcessing}
                className="btn-primary"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isProcessing ? 'Processing...' : 'Choose File'}
              </Button>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Expected Columns:</h4>
              <div className="text-sm grid grid-cols-2 gap-2">
                <span>• Student Name</span>
                <span>• Student Phone</span>
                <span>• Student Email</span>
                <span>• Course Type</span>
                <span>• Course Name</span>
                <span>• Package Type</span>
                <span>• Admission Fee</span>
                <span>• Payment Method</span>
                <span>• Payment Status</span>
                <span>• Admission Date</span>
                <span>• Assigned Employee</span>
                <span>• Referral Source</span>
              </div>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Preview Data ({extractedData.length} records)</h3>
              <Button onClick={handleImport} className="btn-primary">
                Import All Records
              </Button>
            </div>
            
            <div className="max-h-96 overflow-y-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Phone</th>
                    <th className="text-left p-2">Course</th>
                    <th className="text-left p-2">Fee</th>
                    <th className="text-left p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {extractedData.slice(0, 10).map((record, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-2">{record.student_name}</td>
                      <td className="p-2">{record.student_phone}</td>
                      <td className="p-2">{record.course_type}</td>
                      <td className="p-2">৳{record.admission_fee}</td>
                      <td className="p-2">{record.payment_status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {extractedData.length > 10 && (
                <p className="text-center text-muted-foreground p-4">
                  ... and {extractedData.length - 10} more records
                </p>
              )}
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="text-center p-8">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Importing Admissions...</h3>
            <p className="text-muted-foreground">Please wait while we process your data.</p>
          </div>
        )}

        {step === 'complete' && importResults && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileSpreadsheet className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Import Complete!</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{importResults.successful}</p>
                <p className="text-green-700">Successfully Imported</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{importResults.failed}</p>
                <p className="text-red-700">Failed</p>
              </div>
            </div>

            {importResults.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-2">Import Errors:</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {importResults.errors.map((error, index) => (
                    <p key={index} className="text-sm text-red-700">
                      {error.student}: {error.error}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="text-center">
              <Button onClick={handleClose} className="btn-primary">
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}