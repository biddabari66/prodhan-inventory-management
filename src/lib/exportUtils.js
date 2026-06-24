// Shared export helpers for the Reports hub.
// - exportToExcel(filename, sheets) → multi-sheet .xlsx via the `xlsx` lib
// - exportToPDF({ title, subtitle, columns, rows, meta }) → branded PDF via jsPDF + jspdf-autotable
//
// Both are generic/reusable: pass plain column descriptors + row arrays and they
// handle workbook/document assembly and trigger the browser download.

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BRAND = {
  orange: [234, 88, 12], // #ea580c
  amber: [245, 158, 11], // #f59e0b
  slate: [71, 85, 105],
  light: [148, 163, 184],
};

function sanitizeFilename(name) {
  return String(name || 'report').replace(/[^\w.-]+/g, '_').slice(0, 120);
}

function withExt(name, ext) {
  const clean = sanitizeFilename(name);
  return clean.toLowerCase().endsWith(`.${ext}`) ? clean : `${clean}.${ext}`;
}

/**
 * Build a multi-sheet workbook and trigger download.
 * @param {string} filename - base filename (".xlsx" appended if missing)
 * @param {Array<{name:string, columns:{header:string,key:string}[], rows:object[]}>} sheets
 */
export function exportToExcel(filename, sheets) {
  const list = Array.isArray(sheets) ? sheets : [sheets];
  const wb = XLSX.utils.book_new();

  list.forEach((sheet, idx) => {
    const { name = `Sheet${idx + 1}`, columns = [], rows = [] } = sheet || {};
    let ws;

    if (columns.length) {
      // Header row from column descriptors, then map each row to the column keys.
      const headerRow = columns.map((c) => c.header);
      const bodyRows = (rows || []).map((r) =>
        columns.map((c) => {
          const v = r?.[c.key];
          return v === undefined || v === null ? '' : v;
        })
      );
      ws = XLSX.utils.aoa_to_sheet([headerRow, ...bodyRows]);
      // Reasonable auto-ish column widths.
      ws['!cols'] = columns.map((c) => ({
        wch: Math.min(
          40,
          Math.max(
            12,
            String(c.header || '').length + 2,
            ...(rows || []).slice(0, 50).map((r) => String(r?.[c.key] ?? '').length + 2)
          )
        ),
      }));
    } else {
      ws = XLSX.utils.json_to_sheet(rows || []);
    }

    // Sheet names: max 31 chars, no special chars.
    const safeName = String(name).replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || `Sheet${idx + 1}`;
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  });

  if (!list.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['No data']]), 'Empty');
  }

  XLSX.writeFile(wb, withExt(filename, 'xlsx'));
}

/**
 * Render a branded PDF (header + table + paged footer) and save it.
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} [opts.subtitle]
 * @param {{header:string,key:string,align?:string,format?:Function}[]} opts.columns
 * @param {object[]} opts.rows
 * @param {{companyName?:string, dateRange?:string, summary?:Array<{label:string,value:string}>, filename?:string}} [opts.meta]
 */
export function exportToPDF({ title, subtitle, columns = [], rows = [], meta = {} }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 40;

  // ---- Branded header band ----
  doc.setFillColor(...BRAND.orange);
  doc.rect(0, 0, pageWidth, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(17, 24, 39);
  doc.text(String(title || 'Report'), marginX, 40);

  let cursorY = 40;

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...BRAND.slate);
    cursorY += 16;
    doc.text(String(subtitle), marginX, cursorY);
  }

  // Right-aligned meta block (company + generated date + range).
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.slate);
  const metaLines = [];
  if (meta.companyName) metaLines.push(meta.companyName);
  if (meta.dateRange) metaLines.push(meta.dateRange);
  metaLines.push(`Generated: ${new Date().toLocaleString()}`);
  metaLines.forEach((line, i) => {
    doc.text(String(line), pageWidth - marginX, 30 + i * 14, { align: 'right' });
  });

  cursorY += 14;

  // ---- Optional KPI summary strip ----
  if (Array.isArray(meta.summary) && meta.summary.length) {
    const parts = meta.summary.map((s) => `${s.label}: ${s.value}`);
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.orange);
    const wrapped = doc.splitTextToSize(parts.join('     |     '), pageWidth - marginX * 2);
    doc.text(wrapped, marginX, cursorY + 12);
    cursorY += 12 + wrapped.length * 12;
  }

  const head = [columns.map((c) => c.header)];
  const body = (rows || []).map((r) =>
    columns.map((c) => {
      const raw = r?.[c.key];
      const val = typeof c.format === 'function' ? c.format(raw, r) : raw;
      return val === undefined || val === null ? '' : String(val);
    })
  );

  autoTable(doc, {
    head,
    body: body.length ? body : [columns.map(() => '—')],
    startY: cursorY + 14,
    margin: { left: marginX, right: marginX },
    styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak', textColor: [31, 41, 55] },
    headStyles: { fillColor: BRAND.orange, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [255, 247, 237] },
    columnStyles: columns.reduce((acc, c, i) => {
      if (c.align) acc[i] = { halign: c.align };
      return acc;
    }, {}),
    didDrawPage: () => {
      const pageCount = doc.internal.getNumberOfPages();
      const page = doc.internal.getCurrentPageInfo().pageNumber;
      const h = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(...BRAND.light);
      doc.text(
        `${meta.companyName ? meta.companyName + '  •  ' : ''}Prodhan ERP Reports`,
        marginX,
        h - 16
      );
      doc.text(`Page ${page} of ${pageCount}`, pageWidth - marginX, h - 16, { align: 'right' });
    },
  });

  doc.save(withExt(meta.filename || title || 'report', 'pdf'));
}

export default { exportToExcel, exportToPDF };
