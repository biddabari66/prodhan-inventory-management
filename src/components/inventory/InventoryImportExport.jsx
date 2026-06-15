import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Upload, Download, FileSpreadsheet, Loader2, CheckCircle,
  AlertCircle, HelpCircle, FileText, Building2, X, ChevronRight
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import api from '@/api/client';
import { useQuery } from '@tanstack/react-query';

// ── Field mapping: internal key → list of CSV column name synonyms ─────────────
const FIELD_MAP = {
  name:          ['Product Name','Item Name','Name','Title','Product','Item','পণ্যের নাম','পণ্য','নাম','product_name','item_name','ITEM NAME','PRODUCT NAME','name'],
  sku:           ['SKU','Barcode','Product Code','Code','SKU/Barcode','sku','barcode','product_code','এসকেইউ'],
  category:      ['Category','Type','Product Category','ক্যাটাগরি','বিভাগ','category'],
  sellingPrice:  ['Selling Price','Sale Price','Price','MRP','বিক্রয়মূল্য','দাম','selling_price','unit_price'],
  buyingPrice:   ['Cost Price','Purchase Price','Buy Price','ক্রয়মূল্য','buying_price','purchase_price','cost_price'],
  stock:         ['Current Stock','Stock','Quantity','Qty','স্টক','মজুদ','current_stock','stock','quantity'],
  minStockLevel: ['Min Stock','Minimum Stock','Reorder Level','সর্বনিম্ন','min_stock','minimum_stock'],
  description:   ['Description','Details','Notes','বিবরণ','description'],
  author:        ['Author Name','Author','Writer','লেখক','author_name','author'],
  publisher:     ['Publisher','Publication','প্রকাশনী','publisher','publications_name'],
  edition:       ['Edition','Version','সংস্করণ','edition'],
  isbn:          ['ISBN','ISBN-13','আইএসবিএন','isbn'],
  unit:          ['Unit','Units','একক','unit'],
  weight:        ['Weight','ওজন','weight'],
};

// ── Normalize a header for matching ──────────────────────────────────────────
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\u0980-\u09ff]/g, '');

// ── Build mapping: csvHeader → internalKey ────────────────────────────────────
function buildMapping(csvHeaders) {
  const mapping = {};
  const unmapped = [];

  for (const header of csvHeaders) {
    const hn = norm(header);
    let bestKey = null, bestScore = 0;

    for (const [key, synonyms] of Object.entries(FIELD_MAP)) {
      for (const syn of synonyms) {
        const sn = norm(syn);
        let score = 0;
        if (hn === sn) score = 1.0;
        else if (hn.includes(sn) || sn.includes(hn)) score = 0.8;
        else if (hn.startsWith(sn.slice(0, 4)) || sn.startsWith(hn.slice(0, 4))) score = 0.6;
        if (score > bestScore) { bestScore = score; bestKey = key; }
      }
    }

    if (bestScore >= 0.6 && bestKey) {
      mapping[header] = { key: bestKey, score: bestScore };
    } else {
      unmapped.push(header);
    }
  }
  return { mapping, unmapped };
}

// ── Parse CSV text → array of row arrays ─────────────────────────────────────
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const rows = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const row = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQ = !inQ; }
      else if (c === ',' && !inQ) { row.push(cur.trim()); cur = ''; }
      else cur += c;
    }
    row.push(cur.trim());
    rows.push(row);
  }
  return rows;
}

// ── Generate a truly unique SKU ───────────────────────────────────────────────
let _skuCounter = 0;
function uniqueSKU(name) {
  _skuCounter++;
  const slug = String(name || '').slice(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'ITM';
  return `${slug}-${Date.now()}-${_skuCounter}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function InventoryImportExport({ inventory = [], onImportComplete }) {
  const [isOpen, setIsOpen]               = useState(false);
  const [selDeptId, setSelDeptId]         = useState('');
  const [csvInfo, setCsvInfo]             = useState(null);  // { headers, mapping, unmapped, rows, rowCount, file }
  const [importing, setImporting]         = useState(false);
  const [progress, setProgress]           = useState(0);
  const [logs, setLogs]                   = useState([]);
  const [done, setDone]                   = useState(false);

  // ── Load departments ────────────────────────────────────────────────────────
  const { data: deptResp, isLoading: loadingDepts, isError: deptErr } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments', { params: { limit: 100 } }).then(r => r.data?.data ?? r.data ?? []),
    staleTime: 5 * 60 * 1000,
  });
  const departments = Array.isArray(deptResp) ? deptResp : [];

  React.useEffect(() => {
    if (departments.length > 0 && !selDeptId) setSelDeptId(departments[0].id);
  }, [departments, selDeptId]);

  // ── File selected ───────────────────────────────────────────────────────────
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please select a .csv file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const rows = parseCSV(text);
      if (rows.length < 2) { toast.error('CSV has no data rows'); return; }

      const headers = rows[0].map(h => String(h).trim());
      const { mapping, unmapped } = buildMapping(headers);

      // Check name column exists
      const hasName = Object.values(mapping).some(v => v.key === 'name');

      setCsvInfo({ headers, mapping, unmapped, rows, rowCount: rows.length - 1, file, hasName });
      setLogs([]);
      setDone(false);
    };
    reader.readAsText(file, 'UTF-8');
  };

  // ── Import ──────────────────────────────────────────────────────────────────
  const doImport = async () => {
    if (!csvInfo) return;
    setImporting(true);
    setProgress(0);
    setDone(false);
    _skuCounter = 0;

    const { headers, mapping, rows } = csvInfo;
    const dataRows = rows.slice(1);
    const total = dataRows.length;

    let created = 0, updated = 0, skipped = 0, failed = 0;
    const logLines = [`📊 Starting import: ${total} rows`];

    // Build existing name lookup (case-insensitive)
    const existingByName = {};
    for (const item of inventory) {
      const n = (item.item_name || item.name || '').toLowerCase().trim();
      if (n) existingByName[n] = item;
    }

    // ── Process rows one-by-one (no race condition on SKU) ──────────────────
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];

      // Build the field object from CSV columns
      const fields = {};
      headers.forEach((header, idx) => {
        const m = mapping[header];
        if (m) {
          const raw = String(row[idx] ?? '').replace(/"/g, '').trim();
          if (raw) fields[m.key] = raw;
        }
      });

      // If name still missing, use first non-numeric column value as fallback
      if (!fields.name) {
        for (let j = 0; j < row.length; j++) {
          const v = String(row[j] ?? '').replace(/"/g, '').trim();
          if (v && isNaN(Number(v)) && v.length > 1) { fields.name = v; break; }
        }
      }

      if (!fields.name) { skipped++; continue; }

      // Build the clean payload that exactly matches backend Zod schema
      const payload = {
        name:          fields.name,
        sku:           fields.sku || uniqueSKU(fields.name),
        barcode:       fields.sku || '',
        departmentId:  selDeptId || undefined,
        buyingPrice:   parseFloat(String(fields.buyingPrice  || '0').replace(/,/g, '')) || 0,
        sellingPrice:  parseFloat(String(fields.sellingPrice || '0').replace(/,/g, '')) || 0,
        stock:         parseInt(String(fields.stock          || '0').replace(/,/g, '')) || 0,
        minStockLevel: parseInt(String(fields.minStockLevel  || '10').replace(/,/g, '')) || 10,
        unit:          fields.unit || 'pcs',
        description:   fields.description || '',
        author:        fields.author || '',
        publisher:     fields.publisher || '',
        edition:       fields.edition || '',
        isbn:          fields.isbn || '',
        weight:        fields.weight ? (parseFloat(String(fields.weight).replace(/,/g, '')) || undefined) : undefined,
        hasVariants:   false,
        variants:      [],
        isCombo:       false,
        comboItems:    [],
        isActive:      true,
        isFeatured:    false,
        tags:          [],
      };

      // Remove undefined to keep payload clean
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

      try {
        const existing = existingByName[fields.name.toLowerCase()];
        if (existing) {
          // Update existing (partial schema)
          await api.patch(`/inventory/${existing.id}`, payload);
          updated++;
          logLines.push(`↻ Updated: ${fields.name}`);
        } else {
          // Create new
          const res = await api.post('/inventory', payload);
          // Add to local lookup so duplicates within same CSV get updated not recreated
          if (res.data?.id) {
            existingByName[fields.name.toLowerCase()] = { id: res.data.id, item_name: fields.name };
          }
          created++;
          logLines.push(`✓ Created: ${fields.name}`);
        }
      } catch (err) {
        failed++;
        const msg = err.response?.data?.error || err.message || 'Unknown error';
        logLines.push(`✗ Failed: ${fields.name} — ${msg}`);
        console.error('Import row error:', fields.name, err.response?.data || err);
      }

      setProgress(Math.round(((i + 1) / total) * 100));
      // Yield to UI every 5 rows
      if (i % 5 === 4) await new Promise(r => setTimeout(r, 10));
    }

    logLines.push('');
    logLines.push(`✅ Done — Created: ${created}, Updated: ${updated}, Skipped: ${skipped}, Failed: ${failed}`);
    setLogs(logLines);
    setImporting(false);
    setDone(true);

    if (created + updated > 0) {
      toast.success(`Import complete! ${created} created, ${updated} updated.`);
      onImportComplete?.();
    } else {
      toast.error('No items were imported. Check the log for details.');
    }
  };

  // ── Export ──────────────────────────────────────────────────────────────────
  const doExport = () => {
    const items = selDeptId
      ? inventory.filter(i => i.department_id === selDeptId || i.department === selDeptId)
      : inventory;

    if (items.length === 0) { toast.error('No items to export'); return; }

    const headers = ['Item Name','SKU','Category','Stock','Min Stock','Selling Price','Buying Price','Description'];
    const rows = items.map(item => [
      item.item_name || item.name || '',
      item.sku || item.barcode || '',
      item.category?.name || item.category || '',
      item.stock ?? item.current_stock ?? 0,
      item.min_stock_level ?? item.minimum_stock ?? 0,
      item.selling_price ?? item.sellingPrice ?? 0,
      item.buying_price ?? item.buyingPrice ?? 0,
      item.description || '',
    ]);

    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `inventory_export_${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`Exported ${items.length} items`);
  };

  // ── Download template ───────────────────────────────────────────────────────
  const downloadTemplate = () => {
    const headers = 'Item Name,SKU,Category,Current Stock,Min Stock,Selling Price,Buying Price,Description';
    const sample  = '"Argentine Jersey 2XL","AP2XL001","Jerseys","50","10","1250","750","Premium jersey"';
    const blob = new Blob([headers + '\n' + sample], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'inventory_template.csv';
    a.click(); URL.revokeObjectURL(url);
    toast.success('Template downloaded!');
  };

  const reset = () => {
    setCsvInfo(null); setLogs([]); setProgress(0); setDone(false);
  };

  const selDept = departments.find(d => d.id === selDeptId);

  return (
    <div>
      <Button
        onClick={() => { setIsOpen(true); reset(); }}
        className="bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 shadow-lg shadow-violet-200 gap-2"
      >
        <FileSpreadsheet className="h-4 w-4" />
        Smart Import/Export
      </Button>

      <Dialog open={isOpen} onOpenChange={v => { setIsOpen(v); if (!v) reset(); }}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0">
          {/* Header */}
          <div className="bg-gradient-to-r from-violet-600 to-purple-700 text-white p-6 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-white text-xl font-bold">Smart Inventory Import</DialogTitle>
                  <DialogDescription className="text-violet-200 text-sm">
                    Auto-detects columns — supports any CSV format
                  </DialogDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-white hover:bg-white/20 rounded-xl">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Department selector */}
            <div>
              <Label className="text-sm font-semibold text-slate-700 mb-2 block">Department (optional)</Label>
              <div className="flex flex-wrap gap-2">
                {loadingDepts && <span className="text-sm text-slate-400 animate-pulse">Loading...</span>}
                {deptErr && <span className="text-sm text-red-500">Could not load departments</span>}
                <button
                  onClick={() => setSelDeptId('')}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                    selDeptId === ''
                      ? 'bg-violet-600 text-white border-violet-600 shadow-md'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300'
                  }`}
                >All Departments</button>
                {departments.map(d => (
                  <button
                    key={d.id}
                    onClick={() => setSelDeptId(d.id)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                      selDeptId === d.id
                        ? 'bg-violet-600 text-white border-violet-600 shadow-md'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300'
                    }`}
                  >{d.name}</button>
                ))}
              </div>
            </div>

            {/* Actions row */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
                <Download className="w-4 h-4" /> Download Template
              </Button>
              <Button variant="outline" size="sm" onClick={doExport} className="gap-2">
                <Download className="w-4 h-4" /> Export Current Data
              </Button>
            </div>

            {/* File upload */}
            {!csvInfo && (
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-violet-300 rounded-2xl bg-violet-50 cursor-pointer hover:bg-violet-100 transition-colors group">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-violet-100 group-hover:bg-violet-200 rounded-xl flex items-center justify-center transition-colors">
                    <Upload className="w-6 h-6 text-violet-600" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-violet-700">Click to upload your CSV</p>
                    <p className="text-xs text-slate-500 mt-1">Any CSV format — columns auto-detected</p>
                  </div>
                </div>
                <input type="file" accept=".csv" className="hidden" onChange={handleFile} />
              </label>
            )}

            {/* Mapping preview */}
            {csvInfo && !importing && !done && (
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                {/* Header */}
                <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-slate-500" />
                    <div>
                      <p className="font-semibold text-slate-800">{csvInfo.file.name}</p>
                      <p className="text-xs text-slate-500">{csvInfo.rowCount} rows detected</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {csvInfo.hasName
                      ? <Badge className="bg-emerald-100 text-emerald-700 border-0">✓ Name column found</Badge>
                      : <Badge className="bg-amber-100 text-amber-700 border-0">⚠ No name column — will use first text column</Badge>
                    }
                  </div>
                </div>

                {/* Column mapping table */}
                <div className="max-h-56 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">CSV Column</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Maps To</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {csvInfo.headers.map((h, i) => {
                        const m = csvInfo.mapping[h];
                        if (!m) return (
                          <tr key={i} className="bg-white">
                            <td className="px-4 py-2.5 font-medium text-slate-700">{h}</td>
                            <td className="px-4 py-2.5"><span className="text-slate-400 italic text-xs">Ignored</span></td>
                            <td className="px-4 py-2.5">—</td>
                          </tr>
                        );
                        const conf = m.score >= 0.95 ? 'high' : m.score >= 0.7 ? 'medium' : 'low';
                        return (
                          <tr key={i} className="bg-white hover:bg-violet-50 transition-colors">
                            <td className="px-4 py-2.5 font-medium text-slate-800">{h}</td>
                            <td className="px-4 py-2.5">
                              <span className="inline-flex items-center gap-1 text-violet-700 font-medium">
                                <ChevronRight className="w-3.5 h-3.5" />{m.key}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <Badge className={
                                conf === 'high'   ? 'bg-emerald-100 text-emerald-700 border-0 text-xs' :
                                conf === 'medium' ? 'bg-amber-100 text-amber-700 border-0 text-xs' :
                                                    'bg-orange-100 text-orange-700 border-0 text-xs'
                              }>{conf}</Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {csvInfo.unmapped.length > 0 && (
                  <div className="px-5 py-3 bg-amber-50 border-t border-amber-100 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <p className="text-xs text-amber-700">
                      <strong>Unrecognized columns (ignored):</strong> {csvInfo.unmapped.join(', ')}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="px-5 py-4 bg-white border-t border-slate-100 flex gap-3">
                  <Button variant="outline" onClick={reset} className="flex-none">
                    <X className="w-4 h-4 mr-1" /> Cancel
                  </Button>
                  <Button
                    onClick={doImport}
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Confirm & Import {csvInfo.rowCount} Items
                    {selDeptId && selDept && ` → ${selDept.name}`}
                  </Button>
                </div>
              </div>
            )}

            {/* Progress bar while importing */}
            {importing && (
              <div className="rounded-2xl border border-violet-200 bg-violet-50 p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-violet-600 animate-spin" />
                  </div>
                  <div>
                    <p className="font-semibold text-violet-800">Importing products...</p>
                    <p className="text-xs text-violet-500">{progress}% complete — please don't close this window</p>
                  </div>
                </div>
                <div className="w-full bg-white rounded-full h-3 shadow-inner overflow-hidden">
                  <div
                    className="h-3 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* Live log preview (last 5 lines) */}
                {logs.length > 0 && (
                  <div className="rounded-xl bg-white border border-violet-100 p-3 max-h-28 overflow-y-auto font-mono text-xs space-y-1">
                    {logs.slice(-6).map((l, i) => (
                      <p key={i} className={
                        l.startsWith('✓') ? 'text-emerald-600' :
                        l.startsWith('✗') ? 'text-red-500' :
                        l.startsWith('↻') ? 'text-blue-500' :
                        'text-slate-500'
                      }>{l}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Done / results */}
            {done && (
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="bg-emerald-50 border-b border-emerald-100 px-5 py-4 flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <p className="font-semibold text-emerald-800">Import Complete</p>
                </div>
                <div className="p-4 max-h-64 overflow-y-auto font-mono text-xs space-y-1 bg-white">
                  {logs.map((l, i) => (
                    <p key={i} className={
                      l.startsWith('✓') ? 'text-emerald-600' :
                      l.startsWith('✗') ? 'text-red-500' :
                      l.startsWith('↻') ? 'text-blue-500' :
                      l.startsWith('✅') ? 'text-emerald-700 font-bold' :
                      'text-slate-500'
                    }>{l || '\u00a0'}</p>
                  ))}
                </div>
                <div className="px-5 py-4 bg-slate-50 border-t border-slate-100">
                  <Button onClick={reset} variant="outline" className="w-full">
                    Import Another File
                  </Button>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!csvInfo && !importing && !done && (
              <div className="rounded-xl bg-slate-50 border border-dashed border-slate-200 p-5">
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-slate-500 space-y-1">
                    <p className="font-semibold text-slate-700">How it works</p>
                    <p>1. Upload any CSV or Excel-exported CSV file</p>
                    <p>2. Columns are automatically matched to inventory fields</p>
                    <p>3. Review the mapping, then confirm to import</p>
                    <p>4. Existing items (by name) are updated, new items are created</p>
                    <p className="text-xs mt-2">Supports: Item Name, SKU, Category, Stock, Selling Price, Buying Price, and more</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}