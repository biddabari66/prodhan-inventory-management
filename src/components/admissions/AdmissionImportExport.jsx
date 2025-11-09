
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Download, FileSpreadsheet, Loader2, AlertCircle, CheckCircle, HelpCircle, FileText } from 'lucide-react';
import { Admission } from '@/entities/Admission';
import { Income as IncomeApi } from '@/entities/Income';
import { toast, Toaster } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const EXPECTED_HEADERS = [
  'student_name', 'student_phone', 'student_email', 'course_type', 'course_name',
  'package_type', 'admission_fee', 'payment_method', 'payment_status',
  'admission_date', 'assigned_employee', 'referral_source', 'student_address',
  'guardian_name', 'guardian_phone', 'admission_status'
];

export default function AdmissionImportExport({ isOpen, onClose, onImportComplete, employees, admissions }) {
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importLog, setImportLog] = useState([]);
  const [isProcessingExport, setIsProcessingExport] = useState(false);

  const parseCSV = (text) => {
    const lines = text.split('\n');
    const result = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const row = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          row.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      row.push(current.trim());
      result.push(row);
    }
    
    return result;
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast.error('Please select a CSV file.');
        return;
      }
      handleImport(file);
    }
  };

  const handleImport = async (file) => {
    setIsImporting(true);
    setImportProgress(0);
    setImportLog([]);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const rows = parseCSV(text);

        if (rows.length < 2) {
          toast.error("Import failed: File is empty or has no data rows.");
          setIsImporting(false);
          return;
        }

        const headers = rows[0].map(h => String(h).trim().replace(/"/g, ''));
        const missingHeaders = EXPECTED_HEADERS.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
          toast.error(`Import failed: Missing required columns: ${missingHeaders.join(', ')}`);
          setIsImporting(false);
          return;
        }

        const dataRows = rows.slice(1);
        let successfulImports = 0;
        let failedImports = 0;
        const newLogs = [];

        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i];
          const rowData = {};
          
          headers.forEach((header, index) => {
            rowData[header] = row[index] ? String(row[index]).replace(/"/g, '').trim() : '';
          });

          try {
            const admissionData = {
              student_name: rowData.student_name || '',
              student_phone: rowData.student_phone || '',
              student_email: rowData.student_email || '',
              course_type: (rowData.course_type || 'other').toLowerCase(),
              course_name: rowData.course_name || '',
              package_type: (rowData.package_type || 'basic').toLowerCase(),
              admission_fee: parseFloat(rowData.admission_fee) || 0,
              payment_method: (rowData.payment_method || 'cash').toLowerCase(),
              payment_status: (rowData.payment_status || 'pending').toLowerCase(),
              admission_date: rowData.admission_date || new Date().toISOString().slice(0, 10),
              assigned_employee: employees.find(e => e.full_name?.toLowerCase() === rowData.assigned_employee?.toLowerCase())?.id || null,
              referral_source: (rowData.referral_source || 'other').toLowerCase(),
              student_address: rowData.student_address || '',
              guardian_name: rowData.guardian_name || '',
              guardian_phone: rowData.guardian_phone || '',
              admission_status: (rowData.admission_status || 'active').toLowerCase(),
            };

            if (!admissionData.student_name || !admissionData.student_phone) {
              throw new Error("Student Name and Phone are required.");
            }

            // Create the admission record
            const newAdmission = await Admission.create(admissionData);

            // AUTOMATICALLY CREATE INCOME RECORD for paid admissions
            if (newAdmission && newAdmission.admission_fee > 0 && newAdmission.payment_status === 'paid') {
              await IncomeApi.create({
                income_title: `Course Fee: ${newAdmission.student_name} - ${newAdmission.course_name}`,
                revenue_stream: 'course_fees',
                amount: newAdmission.admission_fee,
                income_date: newAdmission.admission_date,
                payment_method: newAdmission.payment_method,
                student_name: newAdmission.student_name,
                course_type: newAdmission.course_type,
                responsible_employee: newAdmission.assigned_employee,
                notes: 'Auto-generated from Admission bulk import.'
              });
            }

            successfulImports++;
            newLogs.push({ status: 'success', message: `Successfully imported admission for ${admissionData.student_name}.` });
          } catch (error) {
            failedImports++;
            newLogs.push({ status: 'error', message: `Failed to import row ${i + 2}: ${error.message}` });
          }
          setImportProgress(((i + 1) / dataRows.length) * 100);
          setImportLog([...newLogs]);
        }

        toast.success(`Import complete: ${successfulImports} successful, ${failedImports} failed.`);
        if (successfulImports > 0) {
          onImportComplete();
        }
      } catch (error) {
        console.error("Error during import process:", error);
        toast.error(`An error occurred during import: ${error.message}`);
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const headers = EXPECTED_HEADERS.join(',');
    const sampleData = [
      'John Doe', '01700000000', 'john.doe@example.com', 'bcs', 'BCS Preliminary',
      'premium', '15000', 'online', 'paid', '2025-01-15', 'Md. Karim (Sales)', 'facebook', '123 Main St, Dhaka',
      'Mr. Doe', '01800000000', 'active'
    ].join(',');
    
    const csvContent = `${headers}\n${sampleData}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'admission_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded successfully!');
  };

  const exportAdmissions = () => {
    if (!admissions || admissions.length === 0) {
      toast.error('No admission data available to export.');
      return;
    }

    setIsProcessingExport(true);
    try {
      const headers = [
        'Student Name', 'Phone', 'Email', 'Course Type', 'Course Name', 'Package',
        'Fee (৳)', 'Payment Method', 'Payment Status', 'Admission Date',
        'Assigned Employee', 'Referral Source', 'Student Address', 'Guardian Name',
        'Guardian Phone', 'Admission Status'
      ];

      const getEmployeeName = (employeeId) => {
        const employee = employees.find(emp => emp.id === employeeId);
        return employee ? employee.full_name : 'Unassigned';
      };

      const csvData = admissions.map(admission => [
        admission.student_name || '',
        admission.student_phone || '',
        admission.student_email || '',
        admission.course_type || '',
        admission.course_name || '',
        admission.package_type || '',
        admission.admission_fee || 0,
        admission.payment_method || '',
        admission.payment_status || '',
        admission.admission_date || '',
        getEmployeeName(admission.assigned_employee),
        admission.referral_source || '',
        admission.student_address || '',
        admission.guardian_name || '',
        admission.guardian_phone || '',
        admission.admission_status || 'active'
      ]);

      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admissions_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`Successfully exported ${admissions.length} admission records!`);
    } catch (error) {
      console.error("Error during export:", error);
      toast.error("Failed to export admissions: " + error.message);
    } finally {
      setIsProcessingExport(false);
    }
  };

  const handleClose = () => {
    setIsImporting(false);
    setImportProgress(0);
    setImportLog([]);
    setIsProcessingExport(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <Toaster richColors position="top-center" />
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileSpreadsheet className="w-6 h-6 text-violet-600" />
            Admission Data Manager
          </DialogTitle>
          <DialogDescription>
            Bulk import new admissions from a CSV file or export existing records for backup and analysis.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
          {/* Import Section */}
          <div className="space-y-4 p-4 rounded-lg border bg-gray-50/50">
            <h3 className="font-semibold text-lg text-gray-800 mb-2 flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />
              Step 1: Import Admissions
            </h3>
            
            <Alert>
              <HelpCircle className="h-4 w-4" />
              <AlertTitle>Instructions</AlertTitle>
              <AlertDescription>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Download the CSV template to ensure correct formatting.</li>
                    <li>Fill the template with your admission data.</li>
                    <li>Upload the completed CSV file below.</li>
                </ol>
              </AlertDescription>
            </Alert>
            
            <Button onClick={downloadTemplate} variant="outline" className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Download CSV Template
            </Button>
            
            <div>
              <Label htmlFor="admission-file" className="font-medium">Upload Your File</Label>
              <Input
                id="admission-file"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={isImporting}
                className="mt-2 file:text-violet-700 file:font-semibold hover:file:bg-violet-100"
              />
            </div>
            {isImporting && (
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${importProgress}%` }}></div>
                <p className="text-center text-sm mt-1">{Math.round(importProgress)}% Complete</p>
              </div>
            )}
          </div>

          {/* Log Section */}
          <div className="space-y-4 p-4 rounded-lg border bg-gray-50/50">
             <h3 className="font-semibold text-lg text-gray-800 mb-2 flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              Step 2: Review Results
            </h3>

            {importLog.length > 0 ? (
              <div className="max-h-80 overflow-y-auto space-y-2 rounded-lg border p-3 text-xs bg-white">
                <h4 className="font-semibold text-gray-800 mb-2">Import Log:</h4>
                {importLog.map((log, index) => (
                  <div key={index} className={`flex items-start gap-2 ${log.status === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                    {log.status === 'success' ? <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                    <span>{log.message}</span>
                  </div>
                ))}
              </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-4 rounded-lg border-2 border-dashed">
                    <FileText className="w-10 h-10 mb-2" />
                    <p className="font-semibold">Import Log Appears Here</p>
                    <p className="text-sm">Results will be shown after you upload a file.</p>
                </div>
            )}
          </div>
        </div>
        <div className="border-t p-4">
             <h3 className="font-semibold text-lg text-gray-800 mb-2 flex items-center gap-2">
              <Download className="w-5 h-5 text-gray-600" />
              Export Data
            </h3>
            <div className="flex items-center justify-between p-4 rounded-lg bg-gray-100">
                 <p className="text-sm text-gray-600">Export all current admission data to a CSV file.</p>
                 <Button onClick={exportAdmissions} className="bg-gray-700 hover:bg-gray-800" disabled={isProcessingExport}>
                    {isProcessingExport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                    Export All Admissions
                </Button>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
