import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { Course } from '@/entities/Course';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// PapaParse library is assumed to be available for robust CSV parsing
// If not, a simple manual parser will be used, but it's less reliable.
// For this implementation, we assume a simple parser.

const REQUIRED_HEADERS = [
  'CourseName', 'Category', 'BatchName', 'StartDate', 'EndDate', 'Status',
  'InstructorName(s)', 'InstructorID(s)', 'Price', 'Discount',
  'DurationHours', 'Mode', 'AdmissionOpen', 'Description'
];

export default function CourseImportExport({ courses = [], onImportComplete }) {
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importResults, setImportResults] = useState(null);

  const downloadTemplate = () => {
    const headers = REQUIRED_HEADERS.join(',');
    const sampleRow = [
      'Advanced BCS Preparation', 'BCS', 'BCS-47th-Evening', '2025-01-15', '2025-07-15', 'Active',
      'Mr. Alam, Ms. Sharmin', 'EMP101,EMP102', '15000', '1500', '120', 'Online', 'Yes', 'Comprehensive prep course.'
    ].join(',');
    
    const csvContent = `${headers}\n${sampleRow}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'courses_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded successfully!');
  };

  const exportCourses = () => {
    if (!courses || courses.length === 0) {
      toast.error('No course data available to export.');
      return;
    }
    
    try {
      const headers = ['CourseID', ...REQUIRED_HEADERS];
      const csvData = courses.map(course => [
        course.id,
        course.course_name,
        course.category,
        course.batch_name,
        course.start_date,
        course.end_date,
        course.status,
        Array.isArray(course.instructor_names) ? course.instructor_names.join('; ') : '',
        Array.isArray(course.instructor_ids) ? course.instructor_ids.join('; ') : '',
        course.price,
        course.discount,
        course.duration_hours,
        course.mode,
        course.admission_open ? 'Yes' : 'No',
        course.description
      ]);
      
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `courses_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`Successfully exported ${courses.length} courses!`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export courses.');
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      setImportFile(file);
      setImportResults(null);
    } else {
      toast.error('Please select a valid CSV file.');
    }
  };

  const parseCSV = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target.result;
          const lines = text.split(/\r\n|\n/);
          const headers = lines[0].split(',').map(h => h.trim());
          const data = [];

          for (let i = 1; i < lines.length; i++) {
            if (!lines[i]) continue;
            const values = lines[i].split(',');
            const entry = {};
            headers.forEach((header, index) => {
              entry[header] = values[index] ? values[index].trim() : undefined;
            });
            data.push(entry);
          }
          resolve({ headers, data });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.warning('Please select a file to import.');
      return;
    }
    
    setIsImporting(true);
    setImportResults(null);
    
    try {
      const { headers, data: coursesToImport } = await parseCSV(importFile);
      
      const missingHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
      }
      
      let successfulImports = 0;
      let failedImports = 0;
      const validationErrors = [];

      const processedCourses = coursesToImport.map((courseData, index) => {
        // Basic validation
        if (!courseData.CourseName || !courseData.Category || !courseData.Status) {
            validationErrors.push(`Row ${index + 2}: Missing required fields (CourseName, Category, or Status).`);
            failedImports++;
            return null;
        }

        return {
            course_name: courseData.CourseName,
            category: courseData.Category,
            batch_name: courseData.BatchName,
            start_date: courseData.StartDate,
            end_date: courseData.EndDate,
            status: courseData.Status,
            instructor_names: courseData['InstructorName(s)']?.split(';').map(s => s.trim()),
            instructor_ids: courseData['InstructorID(s)']?.split(';').map(s => s.trim()),
            price: parseFloat(courseData.Price) || 0,
            discount: parseFloat(courseData.Discount) || 0,
            duration_hours: parseInt(courseData.DurationHours) || 0,
            mode: courseData.Mode,
            admission_open: courseData.AdmissionOpen?.toLowerCase() === 'yes',
            description: courseData.Description
        };
      }).filter(Boolean);
      
      if (processedCourses.length > 0) {
        await Course.bulkCreate(processedCourses);
        successfulImports = processedCourses.length;
      }
      
      setImportResults({ successfulImports, failedImports, validationErrors });
      toast.success('Import process completed.');
      onImportComplete();
    } catch (error) {
      console.error('Import failed:', error);
      toast.error(`Import failed: ${error.message}`);
      setImportResults({ successfulImports: 0, failedImports: 'all', validationErrors: [error.message] });
    } finally {
      setIsImporting(false);
      setImportFile(null);
    }
  };

  return (
    <div className="space-y-6 premium-card p-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <h3 className="text-lg font-semibold">Course Data Management</h3>
        <div className="flex gap-2">
          <Button onClick={downloadTemplate} variant="outline"><Download className="w-4 h-4 mr-2" /> Template</Button>
          <Button onClick={exportCourses} variant="outline"><FileSpreadsheet className="w-4 h-4 mr-2" /> Export</Button>
        </div>
      </div>
      
      <div className="space-y-4 p-4 border rounded-lg">
        <Label htmlFor="course-import" className="font-semibold">Import Courses from CSV</Label>
        <div className="flex flex-col sm:flex-row gap-4">
          <Input id="course-import" type="file" accept=".csv" onChange={handleFileSelect} className="flex-1" />
          <Button onClick={handleImport} disabled={isImporting || !importFile}>
            <Upload className="w-4 h-4 mr-2" />
            {isImporting ? 'Importing...' : 'Start Import'}
          </Button>
        </div>
      </div>

      {importResults && (
        <div className="mt-4 space-y-3">
          {importResults.successfulImports > 0 && (
            <Alert variant="default" className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Import Successful</AlertTitle>
              <AlertDescription className="text-green-700">
                Successfully imported {importResults.successfulImports} courses.
              </AlertDescription>
            </Alert>
          )}
          {importResults.failedImports > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Import Failures</AlertTitle>
              <AlertDescription>
                {importResults.failedImports} records failed to import.
                {importResults.validationErrors.length > 0 && (
                  <ul className="mt-2 list-disc list-inside text-xs">
                    {importResults.validationErrors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}