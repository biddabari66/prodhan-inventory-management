import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, Check, AlertCircle, ArrowRight, X } from 'lucide-react';
import { toast } from 'sonner';

export default function DynamicCSVImport({ 
  onImport, 
  requiredFields = ['customer_name', 'customer_phone'],
  fieldOptions = [
    { key: 'customer_name', label: 'Customer Name', required: true },
    { key: 'customer_phone', label: 'Phone Number', required: true },
    { key: 'product', label: 'Product', required: false },
    { key: 'order_number', label: 'Order Number', required: false },
    { key: 'notes', label: 'Notes', required: false }
  ],
  onClose 
}) {
  const [step, setStep] = useState(1); // 1: upload, 2: mapping, 3: preview
  const [csvData, setCsvData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [fileName, setFileName] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) return { headers: [], data: [] };
    
    const parseRow = (row) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseRow(lines[0]);
    const data = lines.slice(1).map(line => {
      const values = parseRow(line);
      const row = {};
      headers.forEach((h, i) => {
        row[h] = values[i] || '';
      });
      return row;
    }).filter(row => Object.values(row).some(v => v));

    return { headers, data };
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      const { headers, data } = parseCSV(text);
      
      if (headers.length === 0) {
        toast.error('Could not parse CSV file');
        return;
      }

      setCsvHeaders(headers);
      setCsvData(data);
      
      // Auto-map columns based on header names
      const autoMapping = {};
      fieldOptions.forEach(field => {
        const matchingHeader = headers.find(h => 
          h.toLowerCase().includes(field.key.replace('_', ' ').toLowerCase()) ||
          h.toLowerCase().includes(field.label.toLowerCase()) ||
          h.toLowerCase() === field.key.toLowerCase()
        );
        if (matchingHeader) {
          autoMapping[field.key] = matchingHeader;
        }
      });
      setColumnMapping(autoMapping);
      setStep(2);
    };
    reader.readAsText(file);
  };

  const updateMapping = (fieldKey, csvColumn) => {
    setColumnMapping(prev => ({
      ...prev,
      [fieldKey]: csvColumn === 'none' ? '' : csvColumn
    }));
  };

  const isValidMapping = () => {
    return requiredFields.every(field => columnMapping[field]);
  };

  const getMappedData = () => {
    return csvData.map(row => {
      const mappedRow = {};
      Object.entries(columnMapping).forEach(([fieldKey, csvColumn]) => {
        if (csvColumn) {
          mappedRow[fieldKey] = row[csvColumn] || '';
        }
      });
      return mappedRow;
    }).filter(row => requiredFields.every(f => row[f]));
  };

  const handleImport = async () => {
    const data = getMappedData();
    if (data.length === 0) {
      toast.error('No valid data to import');
      return;
    }

    setIsImporting(true);
    try {
      await onImport(data);
      toast.success(`Successfully imported ${data.length} entries`);
      onClose();
    } catch (error) {
      toast.error('Import failed: ' + error.message);
    } finally {
      setIsImporting(false);
    }
  };

  const previewData = getMappedData().slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Step Indicator - Professional Design */}
      <div className="flex items-center justify-center gap-3">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm transition-all ${
              step >= s ? 'bg-red-600 text-white shadow-red-200' : 'bg-slate-100 text-slate-400 border border-slate-200'
            }`}>
              {step > s ? <Check className="w-5 h-5" /> : s}
            </div>
            {s < 3 && (
              <div className={`w-12 h-1 mx-2 rounded-full ${step > s ? 'bg-red-600' : 'bg-slate-200'}`} />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-12 text-sm font-medium">
        <span className={step >= 1 ? 'text-red-600' : 'text-slate-400'}>Upload File</span>
        <span className={step >= 2 ? 'text-red-600' : 'text-slate-400'}>Map Columns</span>
        <span className={step >= 3 ? 'text-red-600' : 'text-slate-400'}>Preview & Import</span>
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="space-y-4">
          <Card className="border-2 border-dashed border-red-200 hover:border-red-400 transition-all bg-gradient-to-br from-red-50/50 to-white">
            <CardContent className="p-10">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
                  <FileSpreadsheet className="w-8 h-8 text-red-600" />
                </div>
                <p className="text-base font-semibold text-slate-800 mb-1">Drop your CSV file here or click to browse</p>
                <p className="text-sm text-slate-500 mb-4">Supports .csv files up to 10MB</p>
                <input 
                  type="file" 
                  accept=".csv"
                  id="csv-file-input"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button 
                  type="button"
                  onClick={() => document.getElementById('csv-file-input').click()}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 h-11"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Select CSV File
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-5">
            <p className="text-sm font-semibold text-red-800 mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Required Fields:
            </p>
            <div className="flex gap-2 flex-wrap">
              {fieldOptions.filter(f => f.required).map(f => (
                <Badge key={f.key} className="bg-red-100 text-red-700 border border-red-200">{f.label}</Badge>
              ))}
            </div>
            <p className="text-xs text-red-600 mt-3">
              Your CSV should have columns that can be mapped to these fields
            </p>
          </div>
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">Map Your Columns</p>
              <p className="text-sm text-slate-500">File: {fileName} ({csvData.length} rows)</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
              Change File
            </Button>
          </div>

          <div className="space-y-3">
            {fieldOptions.map(field => (
              <div key={field.key} className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{field.label}</span>
                    {field.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
                <Select 
                  value={columnMapping[field.key] || 'none'} 
                  onValueChange={(v) => updateMapping(field.key, v)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select column..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Don't import --</SelectItem>
                    {csvHeaders.map(h => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {columnMapping[field.key] && (
                  <Check className="w-4 h-4 text-green-600" />
                )}
              </div>
            ))}
          </div>

          {!isValidMapping() && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-amber-800">Please map all required fields to continue</span>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={() => setStep(3)} disabled={!isValidMapping()} className="bg-red-600 hover:bg-red-700">
              Continue to Preview
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Preview & Import */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">Preview Import</p>
              <p className="text-sm text-slate-500">{getMappedData().length} valid entries found</p>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    {fieldOptions.filter(f => columnMapping[f.key]).map(f => (
                      <th key={f.key} className="px-3 py-2 text-left font-medium text-slate-700">
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, i) => (
                    <tr key={i} className="border-t">
                      {fieldOptions.filter(f => columnMapping[f.key]).map(f => (
                        <td key={f.key} className="px-3 py-2 text-slate-600">
                          {row[f.key] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {getMappedData().length > 5 && (
              <div className="px-3 py-2 bg-slate-50 text-xs text-slate-500 text-center">
                ...and {getMappedData().length - 5} more entries
              </div>
            )}
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              <strong>{getMappedData().length}</strong> entries will be imported. 
              {csvData.length - getMappedData().length > 0 && (
                <span className="text-amber-700"> ({csvData.length - getMappedData().length} rows skipped due to missing required fields)</span>
              )}
            </p>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(2)}>Back to Mapping</Button>
            <Button 
              onClick={handleImport} 
              disabled={isImporting || getMappedData().length === 0}
              className="bg-red-600 hover:bg-red-700"
            >
              {isImporting ? 'Importing...' : `Import ${getMappedData().length} Entries`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}