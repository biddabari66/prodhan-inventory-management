import React, { useState, useRef, useEffect } from 'react';
import api from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScanLine, Truck, PackagePlus, CheckCircle2, XCircle, Loader2, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { BrowserMultiFormatReader } from '@zxing/browser';

export default function BarcodeScan() {
  const [mode, setMode] = useState('ship'); // 'ship' | 'receive'
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [feed, setFeed] = useState([]);
  const inputRef = useRef(null);
  const photoRef = useRef(null);
  const readerRef = useRef(null);

  // Keep the scanner input focused (USB/Bluetooth scanners type + Enter here).
  useEffect(() => {
    const i = setInterval(() => {
      const a = document.activeElement;
      if (a !== inputRef.current && a?.tagName !== 'BUTTON') inputRef.current?.focus();
    }, 1500);
    inputRef.current?.focus();
    return () => clearInterval(i);
  }, [mode]);

  const pushFeed = (entry) => setFeed((f) => [{ ...entry, at: new Date() }, ...f].slice(0, 25));

  const handleScan = async (code) => {
    const barcode = (code || '').trim();
    if (!barcode) return;
    setBusy(true);
    try {
      const url = mode === 'ship' ? '/scan/ship' : '/scan/receive';
      const { data } = await api.post(url, { barcode });
      if (mode === 'ship') {
        const msg = data.alreadyShipped
          ? `${data.order?.orderNumber || barcode} already shipped`
          : `Shipped ${data.order?.orderNumber} (${data.itemsDeducted} item(s) out)`;
        pushFeed({ ok: true, code: barcode, msg, who: data.order?.customerName });
        toast.success(msg);
      } else {
        const msg = data.alreadyReceived
          ? `${barcode} already received`
          : `Received ${data.purchaseOrder?.poNumber} (${data.itemsAdded} item(s) in)`;
        pushFeed({ ok: true, code: barcode, msg });
        toast.success(msg);
      }
    } catch (err) {
      const msg = err?.response?.data?.error || 'Scan failed';
      pushFeed({ ok: false, code: barcode, msg });
      toast.error(msg);
    } finally {
      setBusy(false);
      setValue('');
      inputRef.current?.focus();
    }
  };

  // Phone camera: take a single photo, then decode the still image (no live video).
  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    setBusy(true);
    try {
      if (!readerRef.current) readerRef.current = new BrowserMultiFormatReader();
      const url = URL.createObjectURL(file);
      const result = await readerRef.current.decodeFromImageUrl(url);
      URL.revokeObjectURL(url);
      const code = result?.getText();
      if (code) {
        try { navigator.vibrate?.(80); } catch { /* ignore */ }
        await handleScan(code);
      } else {
        toast.error('No barcode detected — try again, closer and in focus');
        setBusy(false);
      }
    } catch (err) {
      toast.error('No barcode detected in the photo. Hold steady and fill the frame.');
      setBusy(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleScan(value); }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-3xl mx-auto">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ScanLine className="h-6 w-6 text-emerald-500" /> Barcode Scanner
        </h1>
        <p className="text-sm text-muted-foreground">
          Scan a <b>sales order</b> to ship (stock out) or a <b>purchase order</b> to receive (stock in).
          Works with a USB/Bluetooth scanner or your phone camera.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setMode('ship')}
          className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition ${
            mode === 'ship' ? 'border-emerald-500 bg-emerald-50' : 'border-transparent bg-muted/40'
          }`}
        >
          <Truck className={`h-6 w-6 ${mode === 'ship' ? 'text-emerald-600' : 'text-muted-foreground'}`} />
          <div>
            <div className="font-semibold">Ship Order</div>
            <div className="text-xs text-muted-foreground">Sales order → deduct inventory</div>
          </div>
        </button>
        <button
          onClick={() => setMode('receive')}
          className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition ${
            mode === 'receive' ? 'border-indigo-500 bg-indigo-50' : 'border-transparent bg-muted/40'
          }`}
        >
          <PackagePlus className={`h-6 w-6 ${mode === 'receive' ? 'text-indigo-600' : 'text-muted-foreground'}`} />
          <div>
            <div className="font-semibold">Receive PO</div>
            <div className="text-xs text-muted-foreground">Purchase order → add inventory</div>
          </div>
        </button>
      </div>

      {/* Scan input */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <Input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={mode === 'ship' ? 'Scan or type order number…' : 'Scan or type PO number…'}
              className="h-14 text-lg"
              autoFocus
            />
            <Button className="h-14 px-6" disabled={busy} onClick={() => handleScan(value)}>
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Go'}
            </Button>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              USB/Bluetooth scanner: just scan — it types the code and presses Enter.
            </p>
            {/* Native phone camera — opens the camera app to take one photo */}
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhoto}
            />
            <Button variant="outline" className="shrink-0" disabled={busy}
              onClick={() => photoRef.current?.click()}>
              <Camera className="h-4 w-4 mr-2" /> Scan with Phone Camera
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live feed */}
      <Card>
        <CardHeader><CardTitle className="text-base">Recent Scans</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {feed.length === 0 && <p className="text-sm text-muted-foreground">No scans yet.</p>}
          {feed.map((f, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border p-3 text-sm">
              <div className="flex items-center gap-3">
                {f.ok ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <XCircle className="h-5 w-5 text-rose-500" />}
                <div>
                  <div className="font-medium">{f.msg}</div>
                  <div className="text-xs text-muted-foreground">
                    {f.code}{f.who ? ` · ${f.who}` : ''} · {f.at.toLocaleTimeString()}
                  </div>
                </div>
              </div>
              <Badge variant="secondary" className={f.ok ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}>
                {f.ok ? 'OK' : 'Failed'}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
