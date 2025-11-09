import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import { ExtractDataFromUploadedFile, UploadFile } from '@/integrations/Core';
import { Expense } from '@/entities/Expense';
import { User } from '@/entities/User';
import { toast, Toaster } from 'sonner';

export default function ExpenseImportExport({ expenses = [] }) {
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importResults, setImportResults] = useState(null);

  const downloadTemplate = () => {
    const headers = [
      'expense_title', 'category', 'department', 'amount', 'expense_date',
      'vendor_name', 'payment_method', 'urgency', 'comments'
    ];
    
    const sampleData = [
      ['Office Supplies Purchase', 'paper', 'admission', 2500, '2024-01-15', 
       'ABC Stationers', 'cash', 'medium', 'Monthly office supplies']
    ];

    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'expense_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded successfully!');
  };

  const exportExpenses = () => {
    if (!expenses || expenses.length === 0) {
      toast.error('No expense data available to export.');
      return;
    }

    const headers = [
      'Expense Title', 'Category', 'Department', 'Amount (৳)', 'Date', 
      'Status', 'Submitted By', 'Vendor', 'Payment Method', 'Urgency', 'Comments'
    ];

    const csvData = expenses.map(expense => [
      expense.expense_title || '',
      expense.category || '',
      expense.department || '',
      expense.amount || 0,
      expense.expense_date || '',
      expense.status || 'pending_submission',
      expense.submitted_by_name || '',
      expense.vendor_name || '',
      expense.payment_method || '',
      expense.urgency || 'medium',
      expense.comments || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success(`Successfully exported ${expenses.length} expense records!`);
  };

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
      const currentUser = await User.me();
      
      const { file_url } = await UploadFile({ file: importFile });
      
      const expenseSchema = {
        type: "array",
        items: {
          type: "object",
          properties: {
            expense_title: { type: "string" },
            category: { type: "string" },
            department: { type: "string" },
            amount: { type: "number" },
            expense_date: { type: "string" },
            vendor_name: { type: "string" },
            payment_method: { type: "string" },
            urgency: { type: "string" },
            comments: { type: "string" }
          }
        }
      };

      const extractResult = await ExtractDataFromUploadedFile({
        file_url: file_url,
        json_schema: expenseSchema
      });

      if (extractResult.status === 'success' && extractResult.output) {
        const expenseList = Array.isArray(extractResult.output) ? extractResult.output : [extractResult.output];
        
        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        for (const expenseData of expenseList) {
          try {
            if (!expenseData.expense_title || !expenseData.category || !expenseData.amount) {
              errors.push(`Missing required fields for: ${expenseData.expense_title || 'Unknown'}`);
              errorCount++;
              continue;
            }

            await Expense.create({
              expense_title: expenseData.expense_title,
              category: expenseData.category,
              department: expenseData.department || currentUser.department || 'admission',
              amount: parseFloat(expenseData.amount) || 0,
              expense_date: expenseData.expense_date || new Date().toISOString().slice(0, 10),
              vendor_name: expenseData.vendor_name || '',
              payment_method: expenseData.payment_method || 'cash',
              urgency: expenseData.urgency || 'medium',
              comments: expenseData.comments || '',
              submitted_by: currentUser.id,
              submitted_by_name: currentUser.full_name,
              status: 'pending_submission'
            });
            successCount++;
          } catch (error) {
            errors.push(`Failed to import ${expenseData.expense_title}: ${error.message}`);
            errorCount++;
          }
        }

        setImportResults({
          success: successCount,
          errors: errorCount,
          errorDetails: errors
        });

        if (successCount > 0) {
          toast.success(`Successfully imported ${successCount} expenses!`);
        }

        if (errorCount > 0) {
          toast.warning(`${errorCount} records failed to import. Check details below.`);
        }

      } else {
        toast.error('Failed to extract data from file. Please check the format.');
      }

    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import expenses. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card className="premium-card">
      <Toaster richColors />
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5" />
          Expense Import/Export
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Export Section */}
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h3 className="font-semibold text-green-900 mb-2">📤 Export Expenses</h3>
          <p className="text-sm text-green-700 mb-4">
            Export expense data to CSV for backup or analysis.
          </p>
          <div className="flex gap-2">
            <Button onClick={downloadTemplate} variant="outline" className="border-green-300">
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
            <Button onClick={exportExpenses} className="bg-green-600 hover:bg-green-700">
              <Download className="w-4 h-4 mr-2" />
              Export All Expenses
            </Button>
          </div>
        </div>

        {/* Import Section */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">📥 Import Expenses</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="import-file">Upload Expense Data (Excel/CSV)</Label>
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
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isImporting ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import Expenses
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <h4 className="font-semibold text-yellow-900 mb-2">📋 Expected Columns:</h4>
          <div className="text-sm text-yellow-800 grid grid-cols-2 gap-2">
            <span>• expense_title</span>
            <span>• category</span>
            <span>• department</span>
            <span>• amount</span>
            <span>• expense_date</span>
            <span>• vendor_name</span>
            <span>• payment_method</span>
            <span>• urgency</span>
          </div>
        </div>

        {/* Import Results */}
        {importResults && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-800">Successfully imported: {importResults.success} expenses</span>
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