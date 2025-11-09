
import React, { useState } from 'react';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import { ExtractDataFromUploadedFile, UploadFile } from '@/integrations/Core';
import { toast, Toaster } from 'sonner';

export default function EmployeeImportExport({ onImportComplete }) {
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importResults, setImportResults] = useState(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const validTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'];
      if (validTypes.includes(file.type) || file.name.endsWith('.csv')) {
        setImportFile(file);
        setImportResults(null);
      } else {
        toast.error('Please select a valid Excel or CSV file.');
      }
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error('Please select a file first.');
      return;
    }

    setIsImporting(true);
    try {
      // Upload file first
      const { file_url } = await UploadFile({ file: importFile });
      
      // Define expected schema for employee data
      const employeeSchema = {
        type: "array",
        items: {
          type: "object",
          properties: {
            full_name: { type: "string" },
            email: { type: "string" },
            employee_id: { type: "string" },
            department: { type: "string" },
            designation: { type: "string" },
            phone: { type: "string" },
            joining_date: { type: "string" },
            base_salary: { type: "number" }
          }
        }
      };

      // Extract data from file
      const extractResult = await ExtractDataFromUploadedFile({
        file_url: file_url,
        json_schema: employeeSchema
      });

      if (extractResult.status === 'success' && extractResult.output) {
        const employees = Array.isArray(extractResult.output) ? extractResult.output : [extractResult.output];
        
        // Import employees to database
        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        for (const employeeData of employees) {
          try {
            // Validate required fields
            if (!employeeData.full_name || !employeeData.email || !employeeData.employee_id) {
              errors.push(`Missing required fields for: ${employeeData.full_name || 'Unknown'}`);
              errorCount++;
              continue;
            }

            // Create employee record with proper data structure
            await User.create({
              full_name: employeeData.full_name,
              email: employeeData.email,
              employee_id: employeeData.employee_id,
              department: employeeData.department || 'admission',
              designation: employeeData.designation || '',
              phone: employeeData.phone || '',
              joining_date: employeeData.joining_date || new Date().toISOString().slice(0, 10),
              base_salary: parseFloat(employeeData.base_salary) || 0,
              role: 'employee',
              is_active: true,
              // Set targets only for admission department
              admission_target: employeeData.department === 'admission' ? 15 : 0,
              incentive_rate: employeeData.department === 'admission' ? 3.0 : 0
            });
            successCount++;
          } catch (error) {
            errors.push(`Failed to import ${employeeData.full_name}: ${error.message}`);
            errorCount++;
          }
        }

        setImportResults({
          success: successCount,
          errors: errorCount,
          errorDetails: errors
        });

        if (successCount > 0) {
          toast.success(`Successfully imported ${successCount} employees!`);
          if (onImportComplete) onImportComplete();
        }

        if (errorCount > 0) {
          toast.warning(`${errorCount} records failed to import. Check details below.`);
        }

      } else {
        toast.error('Failed to extract data from file. Please check the format.');
      }

    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import employees. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      ['full_name', 'email', 'employee_id', 'department', 'designation', 'phone', 'joining_date', 'base_salary'],
      ['John Doe', 'john@biddabari.com', 'EMP20241001', 'admission', 'Sales Executive', '+8801234567890', '2024-01-01', 25000],
      ['Jane Smith', 'jane@biddabari.com', 'EMP20241002', 'it', 'Developer', '+8801234567891', '2024-01-01', 35000]
    ];

    const csvContent = template.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'employee_import_template.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card className="premium-card">
      <Toaster />
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5" />
          Employee Import/Export
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Download Template */}
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div>
            <h3 className="font-medium text-blue-900">Download Template</h3>
            <p className="text-sm text-blue-700">Get the Excel template with sample data</p>
          </div>
          <Button onClick={downloadTemplate} variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100">
            <Download className="w-4 h-4 mr-2" />
            Download Template
          </Button>
        </div>

        {/* File Upload */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="import-file">Upload Employee Data (Excel/CSV)</Label>
            <Input
              id="import-file"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="mt-2"
            />
          </div>

          {importFile && (
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-800 font-medium">File selected: {importFile.name}</span>
            </div>
          )}

          <Button
            onClick={handleImport}
            disabled={!importFile || isImporting}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {isImporting ? (
              <>
                <Upload className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Import Employees
              </>
            )}
          </Button>
        </div>

        {/* Import Results */}
        {importResults && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-800">Successfully imported: {importResults.success} employees</span>
            </div>

            {importResults.errors > 0 && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="text-red-800 font-medium">Errors: {importResults.errors}</span>
                </div>
                <div className="max-h-32 overflow-y-auto">
                  {importResults.errorDetails.map((error, index) => (
                    <p key={index} className="text-sm text-red-700">{error}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
