/**
 * ExcelImport.jsx
 * Reusable Excel/CSV import component with:
 *  - Drag & drop or file picker
 *  - Column mapping
 *  - Validation preview (errors shown in red)
 *  - Bulk import via API
 *
 * Usage:
 *  <ExcelImport type="products" onImport={handleImport} />
 *  <ExcelImport type="leads" onImport={handleImport} />
 *  <ExcelImport type="employees" onImport={handleImport} />
 */
import React, { useState, useRef, useCallback } from 'react';
import { Upload, Download, CheckCircle2, XCircle, FileSpreadsheet, X, AlertTriangle, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

// ── Column schemas per import type ─────────────────────────────────────────────
const SCHEMAS = {
  products: {
    label: 'Products / Inventory',
    templateFilename: 'product_import_template.csv',
    columns: [
      { key: 'name',       label: 'Product Name', required: true },
      { key: 'sku',        label: 'SKU / Code',   required: false },
      { key: 'category',   label: 'Category',     required: false },
      { key: 'buy_price',  label: 'Buy Price',    required: false, type: 'number' },
      { key: 'sell_price', label: 'Sell Price',   required: true,  type: 'number' },
      { key: 'stock',      label: 'Stock Qty',    required: true,  type: 'number' },
      { key: 'min_stock',  label: 'Min Stock',    required: false, type: 'number' },
      { key: 'unit',       label: 'Unit',         required: false },
      { key: 'description',label: 'Description',  required: false },
    ],
    templateRows: [
      ['Apple iPhone 15', 'IP15-128', 'Electronics', '85000', '95000', '10', '2', 'pcs', 'Latest iPhone'],
    ],
  },
  leads: {
    label: 'CRM Leads',
    templateFilename: 'lead_import_template.csv',
    columns: [
      { key: 'name',   label: 'Full Name',   required: true },
      { key: 'phone',  label: 'Phone',       required: true },
      { key: 'email',  label: 'Email',       required: false },
      { key: 'source', label: 'Source',      required: false },
      { key: 'course', label: 'Course/Product', required: false },
      { key: 'notes',  label: 'Notes',       required: false },
    ],
    templateRows: [
      ['John Doe', '01700000000', 'john@example.com', 'Facebook', 'Premium Plan', 'Interested'],
    ],
  },
  employees: {
    label: 'Employees',
    templateFilename: 'employee_import_template.csv',
    columns: [
      { key: 'full_name',   label: 'Full Name',      required: true },
      { key: 'email',       label: 'Email',           required: true },
      { key: 'phone',       label: 'Phone',           required: false },
      { key: 'designation', label: 'Designation',     required: false },
      { key: 'department',  label: 'Department',      required: false },
      { key: 'join_date',   label: 'Join Date (YYYY-MM-DD)', required: false },
      { key: 'salary',      label: 'Monthly Salary',  required: false, type: 'number' },
    ],
    templateRows: [
      ['Ahmed Khan', 'ahmed@company.com', '01800000000', 'Sales Executive', 'Sales', '2024-01-15', '25000'],
    ],
  },
};

// ── CSV parser ─────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ''; });
    return obj;
  });
  return { headers, rows };
}

// ── Download template ──────────────────────────────────────────────────────────
function downloadTemplate(schema) {
  const headers = schema.columns.map(c => c.label);
  const rows = schema.templateRows;
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = schema.templateFilename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Validate a parsed row against schema ──────────────────────────────────────
function validateRow(row, schema, columnMapping) {
  const errors = [];
  schema.columns.forEach(col => {
    const sourceCol = columnMapping[col.key];
    const val = sourceCol ? row[sourceCol] : '';
    if (col.required && !val) errors.push(`"${col.label}" is required`);
    if (col.type === 'number' && val && isNaN(Number(val))) errors.push(`"${col.label}" must be a number`);
  });
  return errors;
}

export default function ExcelImport({ type = 'products', onImport, className = '' }) {
  const schema = SCHEMAS[type] || SCHEMAS.products;
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileRef = useRef();

  const resetState = () => {
    setFile(null);
    setParsedData(null);
    setColumnMapping({});
  };

  const handleFileSelect = useCallback((selectedFile) => {
    if (!selectedFile) return;
    if (!selectedFile.name.match(/\.(csv|xlsx|xls)$/i)) {
      toast.error('Please upload a CSV or Excel (.xlsx) file');
      return;
    }
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => {
      const { headers, rows } = parseCSV(e.target.result);
      if (!rows.length) { toast.error('File appears empty'); return; }
      // Auto-map columns by fuzzy match
      const autoMap = {};
      schema.columns.forEach(col => {
        const match = headers.find(h =>
          h.toLowerCase().replace(/[^a-z]/g, '') === col.label.toLowerCase().replace(/[^a-z]/g, '') ||
          h.toLowerCase().includes(col.key.toLowerCase())
        );
        if (match) autoMap[col.key] = match;
      });
      setParsedData({ headers, rows });
      setColumnMapping(autoMap);
    };
    reader.readAsText(selectedFile);
  }, [schema]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files[0]);
  }, [handleFileSelect]);

  // Validate all rows
  const validatedRows = parsedData ? parsedData.rows.map(row => ({
    row,
    errors: validateRow(row, schema, columnMapping),
  })) : [];

  const validCount = validatedRows.filter(r => r.errors.length === 0).length;
  const errorCount = validatedRows.length - validCount;

  const handleImport = async () => {
    if (!validCount) { toast.error('No valid rows to import'); return; }
    setIsImporting(true);
    try {
      const validRows = validatedRows
        .filter(r => r.errors.length === 0)
        .map(({ row }) => {
          const mapped = {};
          schema.columns.forEach(col => {
            const src = columnMapping[col.key];
            if (src && row[src] !== undefined) {
              mapped[col.key] = col.type === 'number' ? Number(row[src]) || 0 : row[src];
            }
          });
          return mapped;
        });

      if (onImport) {
        await onImport(validRows);
      }
      toast.success(`✅ Successfully imported ${validCount} ${schema.label}!`);
      resetState();
      setIsOpen(false);
    } catch (err) {
      toast.error('Import failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-300 rounded-xl hover:border-orange-300 hover:text-orange-600 transition-all ${className}`}
      >
        <Upload className="w-4 h-4" />
        Import Excel
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { resetState(); setIsOpen(false); }}>
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Import {schema.label}</h2>
              <p className="text-xs text-slate-400 mt-0.5">Upload a CSV or Excel file to bulk import</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadTemplate(schema)}
              className="flex items-center gap-1.5 text-xs text-orange-600 font-semibold hover:underline"
            >
              <Download className="w-3.5 h-3.5" /> Download Template
            </button>
            <button onClick={() => { resetState(); setIsOpen(false); }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Drop Zone */}
          {!parsedData && (
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-orange-300 hover:bg-orange-50/50 dark:hover:bg-orange-900/10'
              }`}
            >
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">Drop your CSV or Excel file here</p>
              <p className="text-xs text-slate-400 mt-1">or click to browse</p>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => handleFileSelect(e.target.files[0])} />
            </div>
          )}

          {/* Column Mapping */}
          {parsedData && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Map Columns</h3>
                <span className="text-xs text-slate-400">{parsedData.rows.length} rows found in file</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {schema.columns.map(col => (
                  <div key={col.key} className="flex items-center gap-2">
                    <div className="w-28 text-xs text-slate-600 dark:text-slate-400 font-medium flex-shrink-0">
                      {col.label}{col.required && <span className="text-rose-500 ml-0.5">*</span>}
                    </div>
                    <div className="relative flex-1">
                      <select
                        value={columnMapping[col.key] || ''}
                        onChange={e => setColumnMapping(prev => ({ ...prev, [col.key]: e.target.value }))}
                        className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 appearance-none pr-6"
                      >
                        <option value="">— skip —</option>
                        {parsedData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Validation Preview */}
          {parsedData && validatedRows.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> {validCount} valid
                </div>
                {errorCount > 0 && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-900/20 px-2.5 py-1 rounded-full">
                    <XCircle className="w-3 h-3" /> {errorCount} with errors
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden max-h-48 overflow-y-auto">
                {validatedRows.slice(0, 20).map(({ row, errors }, i) => (
                  <div key={i} className={`flex items-start justify-between px-3 py-2 text-xs border-b border-slate-50 dark:border-slate-800/60 last:border-0 ${errors.length ? 'bg-rose-50/50 dark:bg-rose-900/10' : ''}`}>
                    <span className="text-slate-700 dark:text-slate-300 truncate">
                      Row {i + 1}: {Object.values(row).slice(0,2).join(' — ')}
                    </span>
                    {errors.length > 0 ? (
                      <span className="text-rose-500 flex-shrink-0 ml-2 font-medium">{errors[0]}</span>
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 ml-2" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {parsedData && (
          <div className="flex items-center justify-between p-6 border-t border-slate-100 dark:border-slate-800">
            <button onClick={resetState} className="text-sm text-slate-400 hover:text-slate-600 font-medium">
              Choose different file
            </button>
            <button
              onClick={handleImport}
              disabled={!validCount || isImporting}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-400 text-white text-sm font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md hover:shadow-orange-200 transition-all"
            >
              {isImporting ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Importing...</>
              ) : (
                <><Upload className="w-4 h-4" /> Import {validCount} Items</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
