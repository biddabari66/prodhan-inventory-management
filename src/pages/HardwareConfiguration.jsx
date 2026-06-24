import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ScanLine, Bluetooth, Fingerprint, Printer, RefreshCw, CheckCircle2,
  AlertTriangle, Settings, HelpCircle, Smartphone, Usb, Plus, Trash2,
  Copy, Wifi, QrCode, Camera,
} from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/common/PageHeader';
import { withPermission } from '@/components/common/PermissionGuard';
import { createPageUrl } from '@/utils';
import {
  support, connectHidScanner, connectBluetooth, isValidIp, isValidPort,
  loadBiometricDevices, saveBiometricDevices, getWebhookBaseUrl,
} from '@/lib/deviceConnect';

/* ---------- shared bits ---------- */

const STATUS = {
  idle: { label: 'Not connected', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  connecting: { label: 'Connecting…', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  connected: { label: 'Connected', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  unsupported: { label: 'Unsupported', cls: 'bg-rose-100 text-rose-700 border-rose-200' },
};

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.idle;
  return <Badge variant="outline" className={`font-medium ${s.cls}`}>{s.label}</Badge>;
}

function Guide({ steps }) {
  return (
    <div className="rounded-xl border border-orange-100 bg-orange-50/60 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-orange-800">
        <HelpCircle className="h-4 w-4" /> How to connect
      </div>
      <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
        {steps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
    </div>
  );
}

function SectionCard({ icon: Icon, title, description, status, children }) {
  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-sm">
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          {status && <StatusBadge status={status} />}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );
}

/* ---------- 1. Barcode / QR Scanner ---------- */

function ScannerTab() {
  const [testValue, setTestValue] = useState('');
  const [detected, setDetected] = useState(null);
  const [hidDevice, setHidDevice] = useState(null);
  const [hidStatus, setHidStatus] = useState(support.webhid || support.webserial ? 'idle' : 'unsupported');
  const bufRef = useRef({ chars: [], start: 0 });

  // Detect keyboard-wedge scanner: a burst of keystrokes ending in Enter.
  const handleKeyDown = (e) => {
    const now = performance.now();
    const buf = bufRef.current;
    if (buf.chars.length === 0) buf.start = now;
    if (e.key === 'Enter') {
      const elapsed = now - buf.start;
      const value = buf.chars.join('');
      // Scanner heuristic: several chars typed very fast (avg < 30ms/char).
      if (value.length >= 3 && elapsed < value.length * 35) {
        setDetected({ value, ms: Math.round(elapsed) });
        toast.success(`Scanner detected: ${value}`);
      }
      buf.chars = [];
      return;
    }
    if (e.key.length === 1) buf.chars.push(e.key);
    // reset stale buffer
    if (now - buf.start > 1000) { buf.chars = [e.key.length === 1 ? e.key : '']; buf.start = now; }
  };

  const connectHid = async () => {
    setHidStatus('connecting');
    try {
      const d = await connectHidScanner();
      setHidDevice(d);
      setHidStatus('connected');
      toast.success(`Connected: ${d.productName || 'USB scanner'}`);
    } catch (err) {
      setHidStatus('idle');
      toast.error(err.message || 'Could not connect device.');
    }
  };

  const hidSupported = support.webhid || support.webserial;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {/* USB keyboard-wedge */}
        <SectionCard
          icon={ScanLine}
          title="USB Scanner (keyboard mode)"
          description="Most USB barcode scanners act like a keyboard — no driver needed."
          status={detected ? 'connected' : 'idle'}
        >
          <Alert className="border-amber-200 bg-amber-50">
            <CheckCircle2 className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800">Good news — usually no setup needed</AlertTitle>
            <AlertDescription className="text-amber-700">
              Plug the scanner into a USB port. It types the barcode wherever your cursor is, just like a keyboard.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Test your scanner</label>
            <Input
              value={testValue}
              onChange={(e) => setTestValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Click here, then scan any barcode…"
            />
            {detected ? (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                <span>Scanner detected: <strong>{detected.value}</strong> ({detected.ms}ms)</span>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                We detect the fast keystroke burst a scanner produces (many characters then Enter).
              </p>
            )}
          </div>

          <Guide steps={[
            'Plug the scanner into any free USB port and wait a few seconds.',
            'Click inside the "Test your scanner" box above so the cursor is there.',
            'Scan any barcode (e.g. on a product or this screen).',
            'You should see "Scanner detected" with the value — you are ready to use it anywhere in the app.',
          ]} />
        </SectionCard>

        {/* WebHID advanced */}
        <SectionCard
          icon={Usb}
          title="Connect via USB (advanced)"
          description="For scanners that expose a raw USB/HID interface."
          status={hidStatus}
        >
          {hidSupported ? (
            <>
              <p className="text-sm text-slate-600">
                Use this only if your scanner does not work in keyboard mode. It uses the browser&apos;s WebHID API
                to talk to the device directly.
              </p>
              {hidDevice && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{hidDevice.productName || 'USB device'} connected</span>
                </div>
              )}
              <Button onClick={connectHid} disabled={hidStatus === 'connecting'} className="bg-amber-600 hover:bg-amber-700">
                {hidStatus === 'connecting'
                  ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  : <Usb className="mr-2 h-4 w-4" />}
                {hidStatus === 'connecting' ? 'Waiting for device…' : 'Connect via USB (advanced)'}
              </Button>
            </>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Not available in this browser</AlertTitle>
              <AlertDescription>
                Direct USB access (WebHID/Web Serial) needs Chrome or Edge on a desktop computer.
                You can still use the keyboard-mode scanner above — it works everywhere.
              </AlertDescription>
            </Alert>
          )}
          <Guide steps={[
            'Open this page in Chrome or Edge on a desktop computer.',
            'Click "Connect via USB (advanced)".',
            'Pick your scanner from the browser popup and click Connect.',
            'The status badge turns green when the device is connected.',
          ]} />
        </SectionCard>
      </div>

      {/* Phone camera sidebar */}
      <div className="space-y-6">
        <SectionCard
          icon={Smartphone}
          title="Use your phone camera"
          description="No scanner? Scan with a phone."
        >
          <p className="text-sm text-slate-600">
            Open one of the built-in scanner pages on a phone to scan barcodes and QR codes with the camera.
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild variant="outline" className="justify-start">
              <Link to={createPageUrl('BarcodeScan')}><Camera className="mr-2 h-4 w-4" /> Open Barcode Scan</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to={createPageUrl('QRInventory')}><QrCode className="mr-2 h-4 w-4" /> Open QR Inventory</Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to={createPageUrl('LogisticsScan')}><ScanLine className="mr-2 h-4 w-4" /> Open Logistics Scan</Link>
            </Button>
          </div>
          <Alert className="border-amber-200 bg-amber-50">
            <Smartphone className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700">
              Tip: log in on your phone&apos;s browser and open these pages there for the camera scanner.
            </AlertDescription>
          </Alert>
        </SectionCard>
      </div>
    </div>
  );
}

/* ---------- 2. Bluetooth ---------- */

function BluetoothTab() {
  const [status, setStatus] = useState(support.bluetooth ? 'idle' : 'unsupported');
  const [device, setDevice] = useState(null);

  const scan = async () => {
    setStatus('connecting');
    try {
      const d = await connectBluetooth();
      setDevice(d);
      setStatus('connected');
      toast.success(`Found: ${d.name || 'Bluetooth device'}`);
      d.addEventListener?.('gattserverdisconnected', () => {
        setDevice(null);
        setStatus('idle');
        toast.error('Bluetooth device disconnected');
      });
    } catch (err) {
      setStatus(device ? 'connected' : 'idle');
      if (err?.name !== 'NotFoundError') toast.error(err.message || 'Bluetooth scan failed.');
    }
  };

  return (
    <SectionCard
      icon={Bluetooth}
      title="Bluetooth devices"
      description="Pair Bluetooth scanners, printers or sensors."
      status={status}
    >
      {support.bluetooth ? (
        <>
          {device && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              <span>Connected: <strong>{device.name || 'Unnamed device'}</strong></span>
            </div>
          )}
          <Button onClick={scan} disabled={status === 'connecting'} className="bg-amber-600 hover:bg-amber-700">
            {status === 'connecting'
              ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              : <Bluetooth className="mr-2 h-4 w-4" />}
            {status === 'connecting' ? 'Scanning…' : 'Scan for Bluetooth devices'}
          </Button>
        </>
      ) : (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Bluetooth not supported here</AlertTitle>
          <AlertDescription>
            This browser cannot use Web Bluetooth (common on Firefox, Safari and iPhone).
            Use Chrome or Edge on Windows or Android, or pair the device through your operating
            system&apos;s Bluetooth settings instead.
          </AlertDescription>
        </Alert>
      )}
      <Guide steps={[
        'Turn the device on and put it in pairing mode (check its manual — often a hold-to-pair button).',
        'Make sure Bluetooth is turned on for this computer.',
        'Click "Scan for Bluetooth devices".',
        'Choose your device in the browser popup and click Pair.',
        'When the status badge turns green, the device is connected.',
      ]} />
    </SectionCard>
  );
}

/* ---------- 3. Biometric attendance ---------- */

function BiometricTab() {
  const [devices, setDevices] = useState(() => loadBiometricDevices());
  const [form, setForm] = useState({ name: '', ip: '', port: '4370', location: '' });
  const webhook = `${getWebhookBaseUrl()}/webhooks/biometric`;

  useEffect(() => { saveBiometricDevices(devices); }, [devices]);

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const addDevice = () => {
    if (!form.name.trim()) return toast.error('Give the device a name.');
    if (!isValidIp(form.ip)) return toast.error('Enter a valid IP address, e.g. 192.168.1.201');
    if (!isValidPort(form.port)) return toast.error('Enter a valid port (1–65535).');
    setDevices((d) => [...d, { ...form, id: Date.now(), name: form.name.trim() }]);
    setForm({ name: '', ip: '', port: '4370', location: '' });
    toast.success('Device saved.');
  };

  const removeDevice = (id) => setDevices((d) => d.filter((x) => x.id !== id));

  const testConnection = (dev) => {
    if (!isValidIp(dev.ip) || !isValidPort(dev.port)) {
      return toast.error('This device has an invalid IP or port.');
    }
    toast.success(`Settings look valid for ${dev.name}. Now set the device push URL to the webhook below.`);
  };

  const copyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhook);
      toast.success('Webhook URL copied.');
    } catch {
      toast.error('Could not copy — select and copy it manually.');
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <SectionCard
          icon={Fingerprint}
          title="Add a biometric device"
          description="Register fingerprint / face attendance machines on your network."
          status={devices.length ? 'connected' : 'idle'}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Device name</label>
              <Input value={form.name} onChange={setField('name')} placeholder="Main gate scanner" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Location / department</label>
              <Input value={form.location} onChange={setField('location')} placeholder="Head office" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">IP address</label>
              <Input value={form.ip} onChange={setField('ip')} placeholder="192.168.1.201" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Port</label>
              <Input value={form.port} onChange={setField('port')} placeholder="4370" />
            </div>
          </div>
          <Button onClick={addDevice} className="bg-amber-600 hover:bg-amber-700">
            <Plus className="mr-2 h-4 w-4" /> Add device
          </Button>

          {devices.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-700">Registered devices</div>
              {devices.map((d) => (
                <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-medium text-slate-800">
                      <Wifi className="h-4 w-4 text-emerald-600" /> {d.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {d.ip}:{d.port}{d.location ? ` · ${d.location}` : ''}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => testConnection(d)}>Test connection</Button>
                    <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50" onClick={() => removeDevice(d.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          icon={Wifi}
          title="Device push (webhook) URL"
          description="Point your device's cloud/push setting at this address."
        >
          <p className="text-sm text-slate-600">
            Biometric devices send each scan to the server. In your device&apos;s admin panel, set the
            cloud / ADMS / push URL to:
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <code className="flex-1 break-all text-sm text-slate-800">{webhook}</code>
            <Button size="sm" variant="outline" onClick={copyWebhook}><Copy className="h-4 w-4" /></Button>
          </div>
        </SectionCard>
      </div>

      <div className="space-y-6">
        <SectionCard icon={HelpCircle} title="Setup guide" description="Connecting an attendance machine.">
          <Guide steps={[
            'Connect the device to the same network/internet as your office.',
            'Note its IP address and port (default port is usually 4370).',
            'Add it above with a clear name and location, then click "Add device".',
            'Click "Test connection" to confirm the details are valid.',
            'In the device admin menu, set the cloud / push URL to the webhook shown on the left.',
            'Punch in once on the device — the scan will appear in attendance automatically.',
          ]} />
        </SectionCard>
      </div>
    </div>
  );
}

/* ---------- 4. Printer ---------- */

function PrinterTab() {
  const [status] = useState(support.print ? 'connected' : 'unsupported');

  const testPrint = useCallback(() => {
    if (!support.print) return toast.error('Printing is not available in this browser.');
    toast.success('Opening the print dialog…');
    setTimeout(() => window.print(), 200);
  }, []);

  return (
    <SectionCard
      icon={Printer}
      title="Label / receipt printer"
      description="Print labels and receipts through your browser."
      status={status}
    >
      {support.print ? (
        <>
          <p className="text-sm text-slate-600">
            Thermal label and receipt printers work best when set as your computer&apos;s default printer.
            Then printing from the app just uses the normal browser print dialog.
          </p>
          <Button onClick={testPrint} className="bg-amber-600 hover:bg-amber-700">
            <Printer className="mr-2 h-4 w-4" /> Test print
          </Button>
          <Alert className="border-amber-200 bg-amber-50">
            <Usb className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700">
              Advanced: some printers also support direct WebUSB control, but for most staff the default-printer
              method below is the simplest and most reliable.
            </AlertDescription>
          </Alert>
        </>
      ) : (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Printing unavailable</AlertTitle>
          <AlertDescription>This browser does not expose a print function.</AlertDescription>
        </Alert>
      )}
      <Guide steps={[
        'Install the printer using the manufacturer&apos;s driver and connect it (USB or network).',
        'Open your computer settings and set it as the default printer.',
        'For label printers, set the correct paper/label size in the printer settings.',
        'Click "Test print" here and confirm a page comes out.',
        'When printing invoices or labels in the app, choose this printer in the print dialog.',
      ]} />
    </SectionCard>
  );
}

/* ---------- page ---------- */

function HardwareConfiguration() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6 lg:p-8">
        <PageHeader
          icon={Settings}
          title="Hardware Configuration"
          subtitle="Connect scanners, Bluetooth devices, attendance machines and printers."
          breadcrumb="Dashboard / Settings / Hardware"
        />

        <Tabs defaultValue="scanner" className="space-y-6">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl border bg-white p-1 shadow-sm">
            <TabsTrigger value="scanner" className="gap-2 rounded-lg data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700">
              <ScanLine className="h-4 w-4" /> Barcode / QR Scanner
            </TabsTrigger>
            <TabsTrigger value="bluetooth" className="gap-2 rounded-lg data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700">
              <Bluetooth className="h-4 w-4" /> Bluetooth
            </TabsTrigger>
            <TabsTrigger value="biometric" className="gap-2 rounded-lg data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700">
              <Fingerprint className="h-4 w-4" /> Biometric
            </TabsTrigger>
            <TabsTrigger value="printer" className="gap-2 rounded-lg data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700">
              <Printer className="h-4 w-4" /> Printer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scanner"><ScannerTab /></TabsContent>
          <TabsContent value="bluetooth"><BluetoothTab /></TabsContent>
          <TabsContent value="biometric"><BiometricTab /></TabsContent>
          <TabsContent value="printer"><PrinterTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default withPermission(HardwareConfiguration, 'integrations', 'can_view');
