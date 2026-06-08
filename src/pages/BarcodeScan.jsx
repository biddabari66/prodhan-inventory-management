import React, { useState, useRef, useEffect } from 'react';
import api from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScanLine, Truck, PackagePlus, CheckCircle2, XCircle, Loader2, Camera, CameraOff } from 'lucide-react';
import { toast } from 'sonner';
import { BrowserMultiFormatReader } from '@zxing/browser';

export default function BarcodeScan() {
  const [mode, setMode] = useState('ship'); // 'ship' | 'receive'
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [feed, setFeed] = useState([]);
  const [camOn, setCamOn] = useState(false);
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const controlsRef = useRef(null);
  const lastScanRef = useRef({ code: '', at: 0 });

  // Keep the scanner input focused (keyboard-wedge scanners type + Enter here).
  // Paused while the camera is active so it doesn't steal focus.
  useEffect(() => {
    if (camOn) return;
    const i = setInterval(() => {
      if (document.activeElement !== inputRef.current) inputRef.current?.focus();
    }, 1200);
    inputRef.current?.focus();
    return () => clearInterval(i);
  }, [mode, camOn]);

  // Keep a stable ref to the latest scan handler for the camera callback.
  const onScanRef = useRef(null);

  const stopCamera = () => {
    try { controlsRef.current?.stop(); } catch { /* ignore */ }
    controlsRef.current = null;
    setCamOn(false);
  };

  const startCamera = async () => {
    try {
      if (!readerRef.current) readerRef.current = new BrowserMultiFormatReader();
      setCamOn(true);
      controlsRef.current = await readerRef.current.decodeFromVideoDevice(
        undefined, // default camera (rear on phones)
        videoRef.current,
        (result) => {
          if (!result) return;
          const code = result.getText();
          const now = Date.now();
          // Debounce duplicate reads of the same code within 2.5s.
          if (code === lastScanRef.current.code && now - lastScanRef.current.at < 2500) return;
          lastScanRef.current = { code, at: now };
          try { navigator.vibrate?.(80); } catch { /* ignore */ }
          onScanRef.current?.(code);
        }
      );
    } catch (err) {
      setCamOn(false);
      toast.error('Could not access camera. Grant permission or use a USB scanner.');
    }
  };

  // Stop the camera when leaving the page.
  useEffect(() => () => stopCamera(), []);

  const pushFeed = (entry) => setFeed((f) => [{ ...entry, at: new Date() }, ...f].slice(0, 25));

  const handleScan = async (code) => {
    const barcode = code.trim();
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

  // Keep the camera callback pointed at the current handler.
  onScanRef.current = handleScan;

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScan(value);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-3xl mx-auto">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ScanLine className="h-6 w-6 text-emerald-500" /> Barcode Scanner
        </h1>
        <p className="text-sm text-muted-foreground">
          Scan a <b>sales order</b> to ship (stock out) or a <b>purchase order</b> to receive (stock in).
          Works with any USB/Bluetooth barcode scanner.
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
              Tip: a USB/Bluetooth scanner types the code and presses Enter automatically.
            </p>
            {!camOn ? (
              <Button variant="outline" onClick={startCamera} className="shrink-0">
                <Camera className="h-4 w-4 mr-2" /> Scan with Camera
              </Button>
            ) : (
              <Button variant="outline" onClick={stopCamera} className="shrink-0 text-rose-600">
                <CameraOff className="h-4 w-4 mr-2" /> Stop Camera
              </Button>
            )}
          </div>

          {camOn && (
            <div className="mt-4 relative overflow-hidden rounded-xl bg-black">
              <video ref={videoRef} className="w-full max-h-[320px] object-contain" muted playsInline />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-24 w-3/4 rounded-lg border-2 border-emerald-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
              </div>
              <div className="absolute bottom-2 left-0 right-0 text-center text-xs text-white/80">
                Point the camera at the barcode
              </div>
            </div>
          )}
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
