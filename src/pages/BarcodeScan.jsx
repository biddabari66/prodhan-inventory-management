import React, { useState, useRef, useEffect } from 'react';
import api from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScanLine, Truck, PackagePlus, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function BarcodeScan() {
  const [mode, setMode] = useState('ship'); // 'ship' | 'receive'
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [feed, setFeed] = useState([]);
  const inputRef = useRef(null);

  // Keep the scanner input focused (keyboard-wedge scanners type + Enter here).
  useEffect(() => {
    const i = setInterval(() => {
      if (document.activeElement !== inputRef.current) inputRef.current?.focus();
    }, 1200);
    inputRef.current?.focus();
    return () => clearInterval(i);
  }, [mode]);

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
          <p className="mt-2 text-xs text-muted-foreground">
            Tip: keep this field focused — barcode scanners type the code and press Enter automatically.
          </p>
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
