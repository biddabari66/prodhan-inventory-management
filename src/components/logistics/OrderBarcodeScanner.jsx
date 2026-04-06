import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Camera, Keyboard, Package, Truck, Search, CheckCircle,
  RotateCcw, Loader2, ScanLine, AlertCircle, MapPin,
  Phone, ShoppingBag, CreditCard, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import jsQR from 'jsqr';
import { generateOrderBarcode } from '../common/BarcodeGenerator';

const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;

export default function OrderBarcodeScanner({ orders, inventory, onOrderShipped }) {
  const [mode, setMode] = useState('manual');
  const [manualCode, setManualCode] = useState('');
  const [matchedOrder, setMatchedOrder] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanHistory, setScanHistory] = useState([]);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const scanningRef = useRef(false);
  const barcodeDetectorRef = useRef(null);
  const lastDetectTimeRef = useRef(0);
  const manualInputRef = useRef(null);

  // Build lookup maps: barcode→order and orderNumber→order
  const orderLookupMaps = useCallback(() => {
    const byBarcode = new Map();
    const byNumber = new Map();
    (orders || []).forEach(o => {
      if (o.order_number) {
        byNumber.set(o.order_number.toLowerCase(), o);
        // Also map generated barcode digits → order
        const barcode = generateOrderBarcode(o.order_number);
        if (barcode) byBarcode.set(barcode, o);
      }
    });
    return { byBarcode, byNumber };
  }, [orders]);

  const findOrder = useCallback((scannedCode) => {
    if (!scannedCode || !orders?.length) return null;
    const cleaned = scannedCode.trim();
    const { byBarcode, byNumber } = orderLookupMaps();

    // 1. Direct barcode match (12-digit UPC scanned)
    if (byBarcode.has(cleaned)) return byBarcode.get(cleaned);

    // 2. Direct order number match (e.g. PD020483)
    if (byNumber.has(cleaned.toLowerCase())) return byNumber.get(cleaned.toLowerCase());

    // 3. Try extracting digits and matching as barcode
    const digits = cleaned.replace(/\D/g, '');
    if (digits.length === 12 && byBarcode.has(digits)) return byBarcode.get(digits);

    // 4. Try digits as partial order number match
    if (digits.length >= 4) {
      const match = orders.find(o => {
        const oNum = o.order_number?.replace(/\D/g, '') || '';
        return oNum === digits || oNum.endsWith(digits) || digits.endsWith(oNum);
      });
      if (match) return match;
    }

    // 5. Search order_number contains
    return orders.find(o => o.order_number?.toLowerCase().includes(cleaned.toLowerCase()));
  }, [orders, orderLookupMaps]);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    setCameraActive(false);
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const handleCodeDetected = useCallback((rawValue, format) => {
    stopCamera();
    const order = findOrder(rawValue);
    if (order) {
      setMatchedOrder(order);
      setManualCode(order.order_number);
      toast.success(`Order found: ${order.order_number}`);
    } else {
      toast.error(`No order found for: ${rawValue}`);
      setManualCode(rawValue);
    }
  }, [findOrder, stopCamera]);

  const scanLoop = useCallback(() => {
    if (!scanningRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanLoop);
      return;
    }
    const w = video.videoWidth, h = video.videoHeight;
    if (!w || !h) { animFrameRef.current = requestAnimationFrame(scanLoop); return; }
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, w, h);

    // QR
    const imageData = ctx.getImageData(0, 0, w, h);
    const qr = jsQR(imageData.data, w, h, { inversionAttempts: 'attemptBoth' });
    if (qr?.data) { handleCodeDetected(qr.data, 'QR'); return; }

    // Barcode
    const now = Date.now();
    if (hasBarcodeDetector && now - lastDetectTimeRef.current > 300) {
      lastDetectTimeRef.current = now;
      if (!barcodeDetectorRef.current) {
        barcodeDetectorRef.current = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'itf', 'codabar']
        });
      }
      barcodeDetectorRef.current.detect(video).then(barcodes => {
        if (!scanningRef.current) return;
        if (barcodes.length > 0) handleCodeDetected(barcodes[0].rawValue, barcodes[0].format);
      }).catch(() => {});
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

  useEffect(() => () => stopCamera(), [stopCamera]);

  const handleManualSearch = () => {
    if (!manualCode.trim()) return;
    const order = findOrder(manualCode);
    if (order) {
      setMatchedOrder(order);
      toast.success(`Order found: ${order.order_number}`);
    } else {
      toast.error(`No order found for "${manualCode}"`);
    }
  };

  const handleShipOrder = async () => {
    if (!matchedOrder) return;
    if (matchedOrder.order_status === 'shipped') {
      toast.info('Order is already shipped');
      return;
    }
    if (!['confirmed', 'processing', 'packed'].includes(matchedOrder.order_status)) {
      toast.error(`Cannot ship order in "${matchedOrder.order_status}" status. Must be confirmed/processing/packed.`);
      return;
    }
    setProcessing(true);
    try {
      await onOrderShipped(matchedOrder);
      setScanHistory(prev => [{
        orderNumber: matchedOrder.order_number,
        customer: matchedOrder.customer_name,
        items: matchedOrder.order_items?.reduce((s, i) => s + (i.quantity || 1), 0) || 0,
        time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        amount: matchedOrder.total_amount
      }, ...prev].slice(0, 50));
      toast.success(`✅ Order ${matchedOrder.order_number} shipped! Inventory deducted automatically.`);
      resetScan();
    } catch (err) {
      toast.error('Failed: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const resetScan = () => {
    setMatchedOrder(null);
    setManualCode('');
    stopCamera();
    setTimeout(() => manualInputRef.current?.focus(), 100);
  };

  // Build inventory map for item name resolution
  const inventoryMap = useMemo(() => {
    const m = new Map();
    (inventory || []).forEach(i => m.set(i.id, i));
    return m;
  }, [inventory]);

  const getStatusColor = (status) => {
    const map = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-indigo-100 text-indigo-800',
      packed: 'bg-purple-100 text-purple-800',
      shipped: 'bg-cyan-100 text-cyan-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return map[status] || 'bg-slate-100 text-slate-800';
  };

  const canShip = matchedOrder && ['confirmed', 'processing', 'packed'].includes(matchedOrder.order_status);
  const alreadyShipped = matchedOrder && ['shipped', 'out_for_delivery', 'delivered'].includes(matchedOrder.order_status);

  return (
    <div className="space-y-4">
      {/* Mode Selector */}
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

      {/* Camera View */}
      {mode === 'camera' && !matchedOrder && (
        <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-36 border-2 border-white/60 rounded-2xl relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-red-500 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-red-500 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-red-500 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-red-500 rounded-br-lg" />
              <div className="absolute left-2 right-2 h-0.5 bg-red-500 animate-bounce" style={{ top: '50%' }} />
            </div>
          </div>
          <div className="absolute bottom-3 left-0 right-0 text-center">
            <Badge className="bg-black/60 text-white border-0 px-3 py-1">
              {cameraActive ? 'Scan order barcode...' : 'Starting camera...'}
            </Badge>
          </div>
        </div>
      )}

      {/* Manual Input */}
      {mode === 'manual' && !matchedOrder && (
        <div className="flex gap-2">
          <Input
            ref={manualInputRef}
            value={manualCode}
            onChange={e => setManualCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleManualSearch()}
            placeholder="Scan order barcode or type order number (e.g. PD020483)..."
            className="flex-1 h-12 text-lg font-mono"
            autoFocus
          />
          <Button onClick={handleManualSearch} className="bg-red-600 hover:bg-red-700 h-12 px-6">
            <Search className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Matched Order Card */}
      {matchedOrder && (
        <Card className={`border-2 ${canShip ? 'border-blue-300 bg-blue-50' : alreadyShipped ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-amber-50'}`}>
          <CardContent className="p-4 space-y-4">
            {/* Order Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-red-600" />
                <span className="font-mono text-lg font-bold text-red-700">{matchedOrder.order_number}</span>
              </div>
              <Badge className={getStatusColor(matchedOrder.order_status)}>
                {matchedOrder.order_status?.replace(/_/g, ' ')}
              </Badge>
            </div>

            {/* Customer Info */}
            <div className="bg-white rounded-lg border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-slate-900">{matchedOrder.customer_name}</span>
                <span className="text-sm text-slate-500">{matchedOrder.customer_phone}</span>
              </div>
              {matchedOrder.shipping_address && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-slate-600">
                    {[matchedOrder.shipping_address.address_line, matchedOrder.shipping_address.city, matchedOrder.shipping_address.district].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-lg border p-3">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Order Items</p>
              <div className="space-y-1.5">
                {matchedOrder.order_items?.map((item, idx) => {
                  const inv = inventoryMap.get(item.inventory_id);
                  return (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Package className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        <span className="font-medium text-slate-800 truncate">{item.item_name}</span>
                        <Badge variant="outline" className="text-xs flex-shrink-0">×{item.quantity}</Badge>
                      </div>
                      {inv && (
                        <span className={`text-xs font-semibold ml-2 ${inv.current_stock <= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          Stock: {inv.current_stock}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Amount */}
            <div className="flex items-center justify-between bg-white rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-green-600" />
                <span className="font-bold text-green-700 text-lg">৳{(matchedOrder.total_amount || 0).toLocaleString()}</span>
              </div>
              <Badge className={matchedOrder.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                {matchedOrder.payment_status || 'pending'}
              </Badge>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {canShip && (
                <Button
                  onClick={handleShipOrder}
                  disabled={processing}
                  className="flex-1 h-14 text-base font-bold bg-emerald-600 hover:bg-emerald-700 gap-2"
                >
                  {processing ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Truck className="w-5 h-5" />
                      Ship Order & Deduct Stock
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              )}
              {alreadyShipped && (
                <div className="flex-1 h-14 flex items-center justify-center bg-green-100 rounded-lg border-2 border-green-300 gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-bold text-green-700">Already Shipped</span>
                </div>
              )}
              {!canShip && !alreadyShipped && (
                <div className="flex-1 h-14 flex items-center justify-center bg-amber-100 rounded-lg border-2 border-amber-300 gap-2 px-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <span className="font-semibold text-amber-700 text-sm">
                    Status "{matchedOrder.order_status}" — must be confirmed/processing/packed to ship
                  </span>
                </div>
              )}
              <Button variant="outline" onClick={resetScan} className="h-14 px-4">
                <RotateCcw className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scan History */}
      {scanHistory.length > 0 && (
        <Card className="border border-slate-200">
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-600" />
                Shipped Today ({scanHistory.length})
              </p>
            </div>
            <div className="divide-y max-h-64 overflow-y-auto">
              {scanHistory.map((entry, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <div>
                      <span className="font-mono font-bold text-red-700">{entry.orderNumber}</span>
                      <span className="text-slate-500 ml-2">{entry.customer}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">{entry.items} items</Badge>
                    <span className="font-semibold text-green-700">৳{(entry.amount || 0).toLocaleString()}</span>
                    <span className="text-xs text-slate-400">{entry.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Guide */}
      <div className="bg-slate-50 rounded-xl p-4 space-y-2">
        <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">📦 Logistics Scan & Ship Guide</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
          <div className="space-y-1">
            <p className="font-semibold text-red-700">Step 1: Scan</p>
            <p>Point phone camera at the order barcode on the invoice, or use a USB/Bluetooth scanner.</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-blue-700">Step 2: Verify</p>
            <p>Check customer name, address, items and stock levels before shipping.</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-emerald-700">Step 3: Ship</p>
            <p>Tap "Ship Order" — inventory is automatically deducted for all items in the order.</p>
          </div>
        </div>
      </div>
    </div>
  );
}