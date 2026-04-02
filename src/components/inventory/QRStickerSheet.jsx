import React, { useState, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, Search, CheckSquare, Square, Package, X } from 'lucide-react';
import { toast } from 'sonner';
import { QRCodeCanvas, getQRValue, generateQRDataURL } from './QRCodeGenerator';

const LABEL_SIZES = {
  '30_per_page': { name: 'A4 Sheet — 30 Labels (3×10)', cols: 3, rows: 10, labelW: 63.5, labelH: 29.6, unit: 'mm' },
  '24_per_page': { name: 'A4 Sheet — 24 Labels (3×8)', cols: 3, rows: 8, labelW: 63.5, labelH: 33.9, unit: 'mm' },
  '12_per_page': { name: 'A4 Sheet — 12 Labels (3×4)', cols: 3, rows: 4, labelW: 63.5, labelH: 72, unit: 'mm' },
  'thermal_50x30': { name: 'Thermal 50×30mm', cols: 1, rows: 1, labelW: 50, labelH: 30, unit: 'mm' },
};

export default function QRStickerSheet({ inventory }) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [labelSize, setLabelSize] = useState('30_per_page');
  const [copiesPerItem, setCopiesPerItem] = useState(1);
  const printRef = useRef(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return inventory;
    const q = search.toLowerCase();
    return inventory.filter(i =>
      i.item_name?.toLowerCase().includes(q) ||
      i.barcode?.toLowerCase().includes(q) ||
      i.isbn?.toLowerCase().includes(q) ||
      i.category?.toLowerCase().includes(q)
    );
  }, [inventory, search]);

  const toggleItem = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(i => i.id)));
    }
  };

  const selectedItems = useMemo(() =>
    inventory.filter(i => selectedIds.has(i.id)),
    [inventory, selectedIds]
  );

  const handlePrint = async () => {
    if (selectedItems.length === 0) {
      toast.error('Select at least one product');
      return;
    }

    const config = LABEL_SIZES[labelSize];
    const labels = [];
    selectedItems.forEach(item => {
      for (let i = 0; i < copiesPerItem; i++) {
        labels.push(item);
      }
    });

    // Build print HTML — generate real QR data URLs (async)
    // Use 300px for high-quality print output with proper quiet zone
    toast.loading('Generating QR codes...', { id: 'qr-gen' });
    const qrImages = await Promise.all(labels.map(async (item) => ({
      ...item,
      qrDataUrl: await generateQRDataURL(getQRValue(item), 300)
    })));
    toast.dismiss('qr-gen');

    const isThermal = labelSize.startsWith('thermal');
    const pageLabels = isThermal ? 1 : config.cols * config.rows;

    let html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>QR Stickers — Prodhan Inventory</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Anek+Bangla:wght@400;600;700&family=Inter:wght@400;500;600&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Anek Bangla', 'Inter', sans-serif; }
      @page { size: ${isThermal ? `${config.labelW}mm ${config.labelH}mm` : 'A4'}; margin: ${isThermal ? '0' : '10mm 5mm'}; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      .sheet { display: grid; grid-template-columns: repeat(${config.cols}, 1fr); gap: 0; width: 100%; }
      .label {
        width: ${config.labelW}mm; height: ${config.labelH}mm;
        border: ${isThermal ? 'none' : '0.5px dashed #ddd'};
        display: flex; align-items: center; gap: 2mm; padding: 1.5mm;
        overflow: hidden; page-break-inside: avoid;
      }
      .label img { width: ${isThermal ? '22mm' : Math.min(config.labelH - 3, 26) + 'mm'}; height: ${isThermal ? '22mm' : Math.min(config.labelH - 3, 26) + 'mm'}; image-rendering: pixelated; }
      .label-info { flex: 1; min-width: 0; overflow: hidden; }
      .label-name { font-weight: 700; font-size: ${config.labelH > 40 ? '9pt' : '7pt'}; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .label-sku { font-size: 6pt; color: #666; font-family: monospace; margin-top: 0.5mm; }
      .label-price { font-size: ${config.labelH > 40 ? '9pt' : '7pt'}; font-weight: 700; margin-top: 0.5mm; }
      .label-stock { font-size: 5pt; color: #999; }
    </style></head><body>`;

    // Generate pages
    for (let i = 0; i < qrImages.length; i += pageLabels) {
      if (i > 0 && !isThermal) html += '<div style="page-break-before: always;"></div>';
      html += '<div class="sheet">';
      const pageItems = qrImages.slice(i, i + pageLabels);
      pageItems.forEach(item => {
        html += `<div class="label">
          <img src="${item.qrDataUrl}" />
          <div class="label-info">
            <div class="label-name">${item.item_name || ''}</div>
            <div class="label-sku">${item.barcode || item.isbn || item.id?.substring(0, 8) || ''}</div>
            <div class="label-price">৳${(item.selling_price || 0).toLocaleString()}</div>
          </div>
        </div>`;
      });
      // Fill remaining slots with empty labels
      if (!isThermal) {
        for (let j = pageItems.length; j < pageLabels; j++) {
          html += '<div class="label"></div>';
        }
      }
      html += '</div>';
    }

    html += '</body></html>';

    const w = window.open('', '_blank');
    if (!w) { toast.error('Popup blocked — please allow popups'); return; }
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.print(); }, 500);

    toast.success(`Printing ${labels.length} sticker(s) for ${selectedItems.length} product(s)`);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products to print stickers..."
            className="pl-10"
          />
        </div>
        <Select value={labelSize} onValueChange={setLabelSize}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(LABEL_SIZES).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600 whitespace-nowrap">Copies:</span>
          <Input
            type="number"
            min={1}
            max={100}
            value={copiesPerItem}
            onChange={e => setCopiesPerItem(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-20"
          />
        </div>
      </div>

      {/* Selection summary + print */}
      <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={toggleAll} className="gap-2">
            {selectedIds.size === filtered.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            {selectedIds.size === filtered.length ? 'Deselect All' : 'Select All'}
          </Button>
          <Badge variant="secondary">{selectedIds.size} selected</Badge>
          <span className="text-sm text-slate-500">
            = {selectedIds.size * copiesPerItem} sticker{selectedIds.size * copiesPerItem !== 1 ? 's' : ''}
          </span>
        </div>
        <Button
          onClick={handlePrint}
          disabled={selectedIds.size === 0}
          className="bg-red-600 hover:bg-red-700 gap-2"
        >
          <Printer className="w-4 h-4" />
          Print Stickers
        </Button>
      </div>

      {/* Product list with checkboxes + QR preview */}
      <div className="border rounded-xl overflow-hidden bg-white">
        <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Package className="w-10 h-10 mx-auto mb-2" />
              <p>No products found</p>
            </div>
          ) : filtered.map(item => (
            <div
              key={item.id}
              className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors ${selectedIds.has(item.id) ? 'bg-red-50' : ''}`}
              onClick={() => toggleItem(item.id)}
            >
              <Checkbox checked={selectedIds.has(item.id)} className="pointer-events-none" />
              <QRCodeCanvas value={getQRValue(item)} size={40} className="flex-shrink-0 rounded" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-slate-900 truncate" style={{ fontFamily: "'Anek Bangla', sans-serif" }}>
                  {item.item_name}
                </p>
                <div className="flex gap-3 text-xs text-slate-500">
                  {item.barcode && <span>SKU: {item.barcode}</span>}
                  {item.isbn && <span>ISBN: {item.isbn}</span>}
                  <span>Stock: {item.current_stock}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm text-slate-900">৳{(item.selling_price || 0).toLocaleString()}</p>
                <Badge className="bg-slate-100 text-slate-600 text-xs">{item.category}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sticker Preview */}
      {selectedItems.length > 0 && (
        <Card className="border-2 border-dashed border-slate-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Sticker Preview (actual size may vary)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {selectedItems.slice(0, 6).map(item => (
                <div key={item.id} className="flex items-center gap-2 p-2 border rounded-lg bg-white" style={{ width: '200px' }}>
                  <QRCodeCanvas value={getQRValue(item)} size={48} className="flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold leading-tight truncate" style={{ fontFamily: "'Anek Bangla', sans-serif" }}>
                      {item.item_name}
                    </p>
                    <p className="text-[8px] text-slate-500 font-mono">{item.barcode || item.isbn || item.id?.substring(0, 8)}</p>
                    <p className="text-[10px] font-bold">৳{(item.selling_price || 0).toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {selectedItems.length > 6 && (
                <div className="flex items-center justify-center p-2 border rounded-lg bg-slate-50 text-slate-500 text-sm" style={{ width: '200px' }}>
                  +{selectedItems.length - 6} more
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}