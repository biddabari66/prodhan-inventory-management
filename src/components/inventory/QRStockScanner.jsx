import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Camera, Keyboard, Package, ArrowDownToLine, ArrowUpFromLine,
  Search, CheckCircle, RotateCcw, History, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { QRCodeCanvas, getQRValue, extractCodeFromScan } from './QRCodeGenerator';
import jsQR from 'jsqr';

export default function QRStockScanner({ inventory, currentUser, onStockUpdated, autoLookupCode, onAutoLookupHandled }) {
  const [mode, setMode] = useState('manual');
  const [scanAction, setScanAction] = useState('lookup');
  const [manualCode, setManualCode] = useState('');
  const [matchedProduct, setMatchedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [scanHistory, setScanHistory] = useState([]);
  const [cameraActive, setCameraActive] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const scanningRef = useRef(false);
  const manualInputRef = useRef(null);

  const findProduct = useCallback((code) => {
    if (!code || !inventory?.length) return null;
    const cleaned = code.trim().toLowerCase();
    return inventory.find(item =>
      (item.barcode && item.barcode.toLowerCase() === cleaned) ||
      (item.isbn && item.isbn.toLowerCase() === cleaned) ||
      (item.isbn_13 && item.isbn_13.toLowerCase() === cleaned) ||
      (item.id && item.id.toLowerCase() === cleaned)
    );
  }, [inventory]);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    setCameraActive(false);
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const handleCodeDetected = useCallback((rawValue) => {
    stopCamera();
    const code = extractCodeFromScan(rawValue);
    const product = findProduct(code);
    if (product) {
      setMatchedProduct(product);
      setManualCode(code);
      toast.success(`Found: ${product.item_name}`);
    } else {
      toast.error(`No product for code: ${code}`);
    }
  }, [findProduct, stopCamera]);

  const scanLoop = useCallback(() => {
    if (!scanningRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanLoop);
      return;
    }
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (w === 0 || h === 0) {
      animFrameRef.current = requestAnimationFrame(scanLoop);
      return;
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const result = jsQR(imageData.data, w, h, { inversionAttempts: 'attemptBoth' });
    if (result && result.data) {
      handleCodeDetected(result.data);
      return;
    }
    animFrameRef.current = requestAnimationFrame(scanLoop);
  }, [handleCodeDetected]);

  const startCamera = useCallback(async () => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        scanningRef.current = true;
        setCameraActive(true);
        animFrameRef.current = requestAnimationFrame(scanLoop);
      }
    } catch {
      toast.error('Camera not available. Use manual entry.');
      setMode('manual');
    }
  }, [stopCamera, scanLoop]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // Auto-lookup when opened from external QR scan
  useEffect(() => {
    if (autoLookupCode && inventory?.length > 0) {
      const product = findProduct(autoLookupCode);
      if (product) {
        setMatchedProduct(product);
        setManualCode(autoLookupCode);
        toast.success(`Found: ${product.item_name}`);
      } else {
        toast.error(`No product found for code: ${autoLookupCode}`);
      }
      if (onAutoLookupHandled) onAutoLookupHandled();
    }
  }, [autoLookupCode, inventory, findProduct, onAutoLookupHandled]);

  const handleManualSearch = () => {
    if (!manualCode.trim()) return;
    const product = findProduct(manualCode);
    if (product) {
      setMatchedProduct(product);
      toast.success(`Found: ${product.item_name}`);
    } else {
      const q = manualCode.toLowerCase();
      const byName = inventory.find(i => i.item_name?.toLowerCase().includes(q));
      if (byName) {
        setMatchedProduct(byName);
        toast.success(`Found: ${byName.item_name}`);
      } else {
        toast.error(`No product matches "${manualCode}"`);
      }
    }
  };

  const handleStockAction = async () => {
    if (!matchedProduct || scanAction === 'lookup') return;
    if (quantity <= 0) { toast.error('Enter valid quantity'); return; }
    setProcessing(true);
    try {
      const isIn = scanAction === 'stock_in';
      const newStock = isIn
        ? matchedProduct.current_stock + quantity
        : Math.max(0, matchedProduct.current_stock - quantity);
      await base44.entities.Inventory.update(matchedProduct.id, { current_stock: newStock });
      await base44.entities.InventoryMovement.create({
        inventory_item_id: matchedProduct.id,
        movement_type: isIn ? 'in' : 'out',
        quantity: isIn ? quantity : -quantity,
        reference_type: isIn ? 'purchase' : 'sale',
        reference_number: `QR-${scanAction.toUpperCase()}-${Date.now()}`,
        unit_cost: matchedProduct.purchase_price || 0,
        total_value: (matchedProduct.selling_price || 0) * quantity,
        performed_by: currentUser?.id || 'system',
        notes: notes || `QR Scan ${isIn ? 'Stock IN' : 'Stock OUT'}`,
        movement_date: new Date().toISOString().split('T')[0],
        balance_after: newStock
      });
      setScanHistory(prev => [{
        product: matchedProduct.item_name, action: scanAction, quantity, newStock,
        time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      }, ...prev].slice(0, 20));
      toast.success(`${isIn ? 'Stock IN' : 'Stock OUT'}: ${quantity}× ${matchedProduct.item_name} → New stock: ${newStock}`);
      resetScan();
      if (onStockUpdated) onStockUpdated();
    } catch (error) {
      toast.error('Failed: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const resetScan = () => {
    setMatchedProduct(null);
    setManualCode('');
    setQuantity(1);
    setNotes('');
    stopCamera();
    setTimeout(() => manualInputRef.current?.focus(), 100);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { value: 'lookup', label: 'Quick Lookup', icon: Search, bg: 'bg-blue-50', border: 'border-blue-500', text: 'text-blue-700', iconColor: 'text-blue-600' },
          { value: 'stock_in', label: 'Stock IN', icon: ArrowDownToLine, bg: 'bg-green-50', border: 'border-green-500', text: 'text-green-700', iconColor: 'text-green-600' },
          { value: 'stock_out', label: 'Stock OUT', icon: ArrowUpFromLine, bg: 'bg-red-50', border: 'border-red-500', text: 'text-red-700', iconColor: 'text-red-600' },
        ].map(action => (
          <button
            key={action.value}
            onClick={() => setScanAction(action.value)}
            className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
              scanAction === action.value
                ? `${action.border} ${action.bg} shadow-md`
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <action.icon className={`w-6 h-6 ${scanAction === action.value ? action.iconColor : 'text-slate-400'}`} />
            <span className={`text-sm font-semibold ${scanAction === action.value ? action.text : 'text-slate-600'}`}>
              {action.label}
            </span>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          variant={mode === 'manual' ? 'default' : 'outline'} size="sm"
          onClick={() => { stopCamera(); setMode('manual'); }}
          className={mode === 'manual' ? 'bg-red-600 hover:bg-red-700' : ''}
        >
          <Keyboard className="w-4 h-4 mr-1" /> Manual / USB Scanner
        </Button>
        <Button
          variant={mode === 'camera' ? 'default' : 'outline'} size="sm"
          onClick={() => { setMode('camera'); startCamera(); }}
          className={mode === 'camera' ? 'bg-red-600 hover:bg-red-700' : ''}
        >
          <Camera className="w-4 h-4 mr-1" /> Phone Camera
        </Button>
      </div>

      {mode === 'camera' && !matchedProduct && (
        <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-white/60 rounded-2xl relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-red-500 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-red-500 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-red-500 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-red-500 rounded-br-lg" />
            </div>
          </div>
          <div className="absolute bottom-3 left-0 right-0 text-center">
            <Badge className="bg-black/60 text-white border-0">
              {cameraActive ? 'Point at QR code...' : 'Starting camera...'}
            </Badge>
          </div>
        </div>
      )}

      {mode === 'manual' && !matchedProduct && (
        <div className="flex gap-2">
          <Input
            ref={manualInputRef}
            value={manualCode}
            onChange={e => setManualCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleManualSearch()}
            placeholder="Scan barcode or type SKU / ISBN / product name..."
            className="flex-1"
            autoFocus
          />
          <Button onClick={handleManualSearch} className="bg-red-600 hover:bg-red-700">
            <Search className="w-4 h-4" />
          </Button>
        </div>
      )}

      {matchedProduct && (
        <Card className={`border-2 ${
          scanAction === 'stock_in' ? 'border-green-300 bg-green-50' :
          scanAction === 'stock_out' ? 'border-red-300 bg-red-50' :
          'border-blue-300 bg-blue-50'
        }`}>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-start gap-3">
              <QRCodeCanvas value={getQRValue(matchedProduct)} size={64} className="rounded-lg flex-shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-lg text-slate-900" style={{ fontFamily: "'Anek Bangla', sans-serif" }}>
                  {matchedProduct.item_name}
                </p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {matchedProduct.barcode && <Badge variant="outline" className="text-xs">SKU: {matchedProduct.barcode}</Badge>}
                  {matchedProduct.isbn && <Badge variant="outline" className="text-xs">ISBN: {matchedProduct.isbn}</Badge>}
                  <Badge className="bg-slate-200 text-slate-700 text-xs">{matchedProduct.category}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div className="text-center p-2 bg-white rounded-lg border">
                    <p className="text-2xl font-bold text-slate-900">{matchedProduct.current_stock}</p>
                    <p className="text-xs text-slate-500">Current Stock</p>
                  </div>
                  <div className="text-center p-2 bg-white rounded-lg border">
                    <p className="text-2xl font-bold text-green-700">৳{(matchedProduct.selling_price || 0).toLocaleString()}</p>
                    <p className="text-xs text-slate-500">Selling Price</p>
                  </div>
                  <div className="text-center p-2 bg-white rounded-lg border">
                    <p className="text-2xl font-bold text-slate-600">{matchedProduct.minimum_stock}</p>
                    <p className="text-xs text-slate-500">Min Stock</p>
                  </div>
                </div>
              </div>
            </div>

            {scanAction !== 'lookup' && (
              <div className="bg-white rounded-lg border p-3 space-y-3">
                <div className="flex items-center gap-2">
                  {scanAction === 'stock_in'
                    ? <ArrowDownToLine className="w-5 h-5 text-green-600" />
                    : <ArrowUpFromLine className="w-5 h-5 text-red-600" />}
                  <span className="font-semibold text-sm">
                    {scanAction === 'stock_in' ? 'Stock IN — Add to inventory' : 'Stock OUT — Remove from inventory'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Quantity</Label>
                    <Input type="number" min={1} value={quantity}
                      onChange={e => setQuantity(parseInt(e.target.value) || 0)}
                      className="text-center font-bold text-lg h-12" />
                  </div>
                  <div>
                    <Label className="text-xs">New Stock After</Label>
                    <div className={`h-12 flex items-center justify-center rounded-md border text-lg font-bold ${
                      scanAction === 'stock_in' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {scanAction === 'stock_in'
                        ? matchedProduct.current_stock + quantity
                        : Math.max(0, matchedProduct.current_stock - quantity)}
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Notes (optional)</Label>
                  <Input value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="e.g. PO received, packed for order..." />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleStockAction} disabled={processing || quantity <= 0}
                    className={`flex-1 h-12 text-base font-bold ${
                      scanAction === 'stock_in' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                    }`}>
                    {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                      <><CheckCircle className="w-5 h-5 mr-2" />Confirm {scanAction === 'stock_in' ? 'Stock IN' : 'Stock OUT'}</>
                    )}
                  </Button>
                  <Button variant="outline" onClick={resetScan}><RotateCcw className="w-4 h-4" /></Button>
                </div>
              </div>
            )}

            {scanAction === 'lookup' && (
              <Button variant="outline" onClick={resetScan} className="w-full">
                <RotateCcw className="w-4 h-4 mr-2" /> Scan Next Product
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {scanHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="w-4 h-4" /> Recent Scans ({scanHistory.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-48 overflow-y-auto">
              {scanHistory.map((entry, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    {entry.action === 'stock_in'
                      ? <ArrowDownToLine className="w-4 h-4 text-green-600" />
                      : entry.action === 'stock_out'
                        ? <ArrowUpFromLine className="w-4 h-4 text-red-600" />
                        : <Search className="w-4 h-4 text-blue-600" />}
                    <span className="font-medium truncate max-w-[200px]">{entry.product}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {entry.action !== 'lookup' && (
                      <Badge className={entry.action === 'stock_in' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {entry.action === 'stock_in' ? '+' : '-'}{entry.quantity} → {entry.newStock}
                      </Badge>
                    )}
                    <span className="text-xs text-slate-400">{entry.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}