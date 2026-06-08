import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { FileSpreadsheet, Upload, Download, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { erp } from '@/api/erpClient';

// Maps common spreadsheet headers -> Lead fields (case/space-insensitive).
const FIELD_ALIASES = {
  student_name: ['name', 'student name', 'student_name', 'full name', 'lead name', 'customer name', 'contact'],
  phone: ['phone', 'mobile', 'contact number', 'phone number', 'cell', 'whatsapp'],
  email: ['email', 'e-mail', 'mail'],
  course_interest: ['course', 'course interest', 'interest', 'product', 'service'],
  notes: ['notes', 'note', 'remarks', 'comment', 'comments'],
  lead_source: ['source', 'lead source', 'channel'],
};

const SOURCE_MAP = {
  facebook: 'FACEBOOK', fb: 'FACEBOOK', instagram: 'INSTAGRAM', ig: 'INSTAGRAM',
  website: 'WEBSITE', web: 'WEBSITE', phone: 'PHONE', call: 'PHONE',
  whatsapp: 'WHATSAPP', referral: 'REFERRAL', walkin: 'WALK_IN', 'walk in': 'WALK_IN',
  google: 'GOOGLE_ADS', 'google ads': 'GOOGLE_ADS',
};

const normKey = (k) => String(k || '').trim().toLowerCase();

function resolveField(headers) {
  const map = {};
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    const hit = headers.find((h) => aliases.includes(normKey(h)));
    if (hit) map[field] = hit;
  }
  return map;
}

export default function LeadExcelUpload({ onComplete }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef();

  const reset = () => { setRows([]); setMapping({}); setProgress(0); setResult(null); setBusy(false); };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (!json.length) { toast.error('The file appears to be empty'); return; }
        const headers = Object.keys(json[0]);
        const map = resolveField(headers);
        if (!map.student_name && !map.phone) {
          toast.error('Could not find a Name or Phone column. Check your headers.');
        }
        setRows(json);
        setMapping(map);
        setResult(null);
      } catch (err) {
        console.error(err);
        toast.error('Failed to read the spreadsheet');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const buildLead = (row) => {
    const val = (field) => (mapping[field] ? String(row[mapping[field]] ?? '').trim() : '');
    const srcRaw = normKey(val('lead_source'));
    return {
      student_name: val('student_name') || 'Unknown',
      phone: val('phone'),
      email: val('email') || undefined,
      course_interest: val('course_interest') || undefined,
      notes: val('notes') || undefined,
      lead_source: SOURCE_MAP[srcRaw] || 'WEBSITE',
      lead_status: 'NEW',
    };
  };

  const handleImport = async () => {
    setBusy(true);
    let ok = 0, fail = 0;
    const valid = rows.filter((r) => mapping.phone ? String(r[mapping.phone] ?? '').trim() : true);
    for (let i = 0; i < valid.length; i++) {
      try {
        await erp.entities.Lead.create(buildLead(valid[i]));
        ok++;
      } catch {
        fail++;
      }
      setProgress(Math.round(((i + 1) / valid.length) * 100));
    }
    setResult({ ok, fail, total: valid.length });
    setBusy(false);
    toast.success(`Imported ${ok} leads${fail ? `, ${fail} failed` : ''}`);
    onComplete?.();
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { Name: 'John Doe', Phone: '01700000000', Email: 'john@example.com', Source: 'Facebook', Course: 'Premium Plan', Notes: 'Interested' },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    XLSX.writeFile(wb, 'lead_import_template.xlsx');
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FileSpreadsheet className="w-4 h-4 mr-2" /> Import Excel
      </Button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Import Leads from Excel / CSV</DialogTitle></DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-dashed p-4">
              <div className="text-sm text-muted-foreground">
                Upload <b>.xlsx</b>, <b>.xls</b> or <b>.csv</b>. Columns are auto-detected.
              </div>
              <Button variant="ghost" size="sm" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-1" /> Template
              </Button>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFile}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-purple-600 file:px-4 file:py-2 file:text-white hover:file:bg-purple-700"
            />

            {rows.length > 0 && (
              <div className="rounded-lg bg-muted/40 p-3 text-sm">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> {rows.length} rows detected
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Mapped: {Object.keys(mapping).map((k) => k.replace('_', ' ')).join(', ') || 'none'}
                </div>
              </div>
            )}

            {busy && <Progress value={progress} />}

            {result && (
              <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                Imported {result.ok} / {result.total}{result.fail ? ` · ${result.fail} failed` : ''}
              </div>
            )}

            {rows.length > 0 && !mapping.phone && !mapping.student_name && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                <AlertCircle className="w-4 h-4" /> No Name/Phone column found — check headers.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); reset(); }}>Close</Button>
            <Button onClick={handleImport} disabled={busy || rows.length === 0}>
              {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Import {rows.length || ''} Leads
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
