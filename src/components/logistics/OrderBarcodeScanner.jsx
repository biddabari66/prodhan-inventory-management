import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Camera, Keyboard, Package, Truck, Search, CheckCircle,
  RotateCcw, Loader2, ScanLine, AlertCircle, MapPin,
  Phone, ShoppingBag, CreditCard, ArrowRight, Volume2
} from 'lucide-react';
import { toast } from 'sonner';
import jsQR from 'jsqr';
import { generateOrderBarcode } from '../common/BarcodeGenerator';

const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;

/**
 * Production-ready Order Barcode Scanner
 * 
 * Matching strategy (in priority order):
 * 1. Exact order_number match (e.g. "PD0596960", "WC-1775482105614")
 * 2. UPC-A barcode → reverse lookup via generateOrderBarcode() 
 * 3. Numeric extraction → match against order number digits
 * 4. Partial/contains search as last resort
 * 
 * The printed invoice barcode is a UPC-A encoding of the order number's digits.
 * When scanned, we get 12 digits back and must reverse-map to order_number.
 */
export default function OrderBarcodeScanner({ orders, inventory, onOrderShipped }) {
  const [mode, setMode] = useState('manual');
  const [manualCode, setManualCode] = useState('');
  const [matchedOrder, setMatchedOrder] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanHistory, setScanHistory] = useState([]);
  const [lastScannedRaw, setLastScannedRaw] = useState('');
  const [scanCount, setScanCount] = useState(0);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const scanningRef = useRef(false);
  const barcodeDetectorRef = useRef(null);
  const lastDetectTimeRef = useRef(0);
  const manualInputRef = useRef(null);
  const cooldownRef = useRef(false);

  // Build comprehensive lookup maps — memoized for performance
  const lookupMaps = useMemo(() => {
    const byBarcode = new Map();     // 12-digit UPC → order
    const byNumber = new Map();      // exact order_number (lowered) → order
    const byDigits = new Map();      // digits-only from order_number → order
    const byTrailingDigits = new Map(); // last 6-8 digits → order (for truncated scans)

    (orders || []).forEach(o => {
      if (!o.order_number) return;
      const num = o.order_number;
      const numLower = num.toLowerCase();
      
      // Exact order number
      byNumber.set(numLower, o);
      byNumber.set(num, o); // case-sensitive too

      // Generate UPC-A barcode the same way ThermalReceipt does
      const barcode = generateOrderBarcode(num);
      if (barcode && barcode.length === 12) {
        byBarcode.set(barcode, o);
      }
      
      // Also try with "PD" prefix version (ThermalReceipt uses shortInvoiceNo)
      if (num.startsWith('PD')) {
        const pdBarcode = generateOrderBarcode(num);
        if (pdBarcode) byBarcode.set(pdBarcode, o);
      }

      // Digits only
      const digits = num.replace(/\D/g, '');
      if (digits) {
        byDigits.set(digits, o);
        // Trailing digits (last 6, 7, 8)
        if (digits.length >= 6) byTrailingDigits.set(digits.slice(-6), o);
        if (digits.length >= 7) byTrailingDigits.set(digits.slice(-7), o);
        if (digits.length >= 8) byTrailingDigits.set(digits.slice(-8), o);
      }
    });

    return { byBarcode, byNumber, byDigits, byTrailingDigits };
  }, [orders]);

  // Multi-strategy order finder
  const findOrder = useCallback((scannedCode) => {
    if (!scannedCode || !orders?.length) return null;
    const raw = scannedCode.trim();
    if (!raw) return null;

    const { byBarcode, byNumber, byDigits, byTrailingDigits } = lookupMaps;

    // Strategy 1: Direct exact order_number match
    if (byNumber.has(raw)) return byNumber.get(raw);
    if (byNumber.has(raw.toLowerCase())) return byNumber.get(raw.toLowerCase());
    // Try with common prefixes
    if (byNumber.has('PD' + raw)) return byNumber.get('PD' + raw);
    if (byNumber.has('WC-' + raw)) return byNumber.get('WC-' + raw);

    // Strategy 2: UPC-A barcode match (12 pure digits from scanner)
    const digitsOnly = raw.replace(/\D/g, '');
    if (digitsOnly.length === 12 && byBarcode.has(digitsOnly)) {
      return byBarcode.get(digitsOnly);
    }
    // Also try the raw value as barcode (scanner might include non-digit chars)
    if (byBarcode.has(raw)) return byBarcode.get(raw);

    // Strategy 3: Strip check digit (last digit) and try as 11-digit → regenerate barcode
    if (digitsOnly.length === 12) {
      const without_check = digitsOnly.slice(0, 11);
      // Try matching against order digits
      if (byDigits.has(without_check)) return byDigits.get(without_check);
      // The 11 digits might be zero-padded order digits
      const unpadded = without_check.replace(/^0+/, '');
      if (byDigits.has(unpadded)) return byDigits.get(unpadded);
    }

    // Strategy 4: Direct digits match
    if (digitsOnly && byDigits.has(digitsOnly)) return byDigits.get(digitsOnly);

    // Strategy 5: Trailing digits match (handles truncation)
    if (digitsOnly.length >= 6) {
      const trail6 = digitsOnly.slice(-6);
      const trail7 = digitsOnly.slice(-7);
      const trail8 = digitsOnly.slice(-8);
      if (byTrailingDigits.has(trail8)) return byTrailingDigits.get(trail8);
      if (byTrailingDigits.has(trail7)) return byTrailingDigits.get(trail7);
      if (byTrailingDigits.has(trail6)) return byTrailingDigits.get(trail6);
    }

    // Strategy 6: Reverse — generate barcode for each order and see if scanned code matches
    // This handles edge cases where encoding differs
    if (digitsOnly.length >= 7) {
      for (const o of orders) {
        if (!o.order_number) continue;
        const oDigits = o.order_number.replace(/\D/g, '');
        // Check if scanned digits contain the order digits or vice versa
        if (oDigits && (digitsOnly.includes(oDigits) || oDigits.includes(digitsOnly))) {
          return o;
        }
      }
    }

    // Strategy 7: Fuzzy text search (order_number contains scanned text)
    const rawLower = raw.toLowerCase();
    const found = orders.find(o => 
      o.order_number?.toLowerCase().includes(rawLower) ||
      rawLower.includes(o.order_number?.toLowerCase())
    );
    if (found) return found;

    return null;
  }, [orders, lookupMaps]);

  // Audio feedback for successful scan
  const playBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 1200;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  }, []);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    setCameraActive(false);
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const handleCodeDetected = useCallback((rawValue, format) => {
    // Prevent duplicate rapid scans
    if (cooldownRef.current) return;
    cooldownRef.current = true;
    setTimeout(() => { cooldownRef.current = false; }, 1500);

    setLastScannedRaw(rawValue);
    setScanCount(c => c + 1);
    
    stopCamera();
    playBeep();

    const order = findOrder(rawValue);
    if (order) {
      setMatchedOrder(order);
      setManualCode(order.order_number);
      toast.success(`✅ Order found: ${order.order_number}`, { duration: 3000 });
    } else {
      toast.error(
        `No order found for scanned value: "${rawValue}".\nTry typing the order number directly.`,
        { duration: 5000 }
      );
      setManualCode(rawValue);
    }
  }, [findOrder, stopCamera, playBeep]);

  // Camera scan loop — processes both QR codes (jsQR) and barcodes (BarcodeDetector)
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

    // Try QR code detection (works everywhere)
    const imageData = ctx.getImageData(0, 0, w, h);
    const qr = jsQR(imageData.data, w, h, { inversionAttempts: 'attemptBoth' });
    if (qr?.data) { handleCodeDetected(qr.data, 'QR'); return; }

    // Try native BarcodeDetector (Chrome Android, some desktop browsers)
    const now = Date.now();
    if (hasBarcodeDetector && now - lastDetectTimeRef.current > 250) {
      lastDetectTimeRef.current = now;
      if (!barcodeDetectorRef.current) {
        barcodeDetectorRef.current = new window.BarcodeDetector({
          formats: ['upc_a', 'upc_e', 'ean_13', 'ean_8', 'code_128', 'code_39', 'itf', 'codabar', 'qr_code']
        });
      }
      barcodeDetectorRef.current.detect(video).then(barcodes => {
        if (!scanningRef.current) return;
        if (barcodes.length > 0) {
          handleCodeDetected(barcodes[0].rawValue, barcodes[0].format);
        }
      }).catch(() => {});
    }

    animFrameRef.current = requestAnimationFrame(scanLoop);
  }, [handleCodeDetected]);

  const startCamera = useCallback(async () => {
    stopCamera();
    setLastScannedRaw('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: 'environment' }, 
          width: { ideal: 1920, min: 640 }, 
          height: { ideal: 1080, min: 480 },
          frameRate: { ideal: 30 }
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        scanningRef.current = true;
        setCameraActive(true);
        animFrameRef.current = requestAnimationFrame(scanLoop);
        toast.info('Camera ready — point at barcode', { duration: 2000 });
      }
    } catch (err) {
      console.error('Camera error:', err);
      toast.error('Camera not available. Use manual entry or USB scanner.');
      setMode('manual');
    }
  }, [stopCamera, scanLoop]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // Auto-focus manual input on mode switch
  useEffect(() => {
    if (mode === 'manual' && !matchedOrder) {
      setTimeout(() => manualInputRef.current?.focus(), 150);
    }
  }, [mode, matchedOrder]);

  const handleManualSearch = () => {
    if (!manualCode.trim()) return;
    setLastScannedRaw(manualCode.trim());
    const order = findOrder(manualCode);
    if (order) {
      setMatchedOrder(order);
      playBeep();
      toast.success(`✅ Order found: ${order.order_number}`);
    } else {
      toast.error(`No order found for "${manualCode}". Check the order number and try again.`);
    }
  };

  const handleShipOrder = async () => {
    if (!matchedOrder) return;
    if (matchedOrder.order_status === 'shipped') {
      toast.info('Order is already shipped');
      return;
    }
    if (!['confirmed', 'processing', 'packed'].includes(matchedOrder.order_status)) {
      toast.error(`Cannot ship — order status is "${matchedOrder.order_status}". Must be confirmed/processing/packed.`);
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
      toast.error('Ship failed: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const resetScan = () => {
    setMatchedOrder(null);
    setManualCode('');
    setLastScannedRaw('');
    stopCamera();
    if (mode === 'camera') {
      // Restart camera for next scan
      setTimeout(() => startCamera(), 300);
    } else {
      setTimeout(() => manualInputRef.current?.focus(), 100);
    }
  };

  const inventoryMap = useMemo(() => {
    const m = new Map();
    (inventory || []).forEach(i => m.set(i.id, i));
    return m;
  }, [inventory]);

  const getStatusColor = (status) => {
    const map = {
      pending: 'bg-yellow-100 text-yellow-800',
      on_hold: 'bg-orange-100 text-orange-800',
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-indigo-100 text-indigo-800',
      packed: 'bg-purple-100 text-purple-800',
      shipped: 'bg-cyan-100 text-cyan-800',
      out_for_delivery: 'bg-teal-100 text-teal-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      returned: 'bg-rose-100 text-rose-800',
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
          {/* Scan target overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-72 h-40 border-2 border-white/50 rounded-2xl relative">
              <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-red-500 rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-red-500 rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-red-500 rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-red-500 rounded-br-xl" />
              <div className="absolute left-3 right-3 h-0.5 bg-red-500/80 animate-pulse" style={{ top: '50%' }} />
            </div>
          </div>
          <div className="absolute bottom-3 left-0 right-0 text-center space-y-1">
            <Badge className="bg-black/70 text-white border-0 px-3 py-1.5 text-sm">
              {cameraActive ? '📷 Point at order barcode...' : '⏳ Starting camera...'}
            </Badge>
            {!hasBarcodeDetector && cameraActive && (
              <div>
                <Badge className="bg-amber-500/90 text-white border-0 px-2 py-1 text-xs">
                  ⚠ This browser has limited barcode support. Use manual input for best results.
                </Badge>
              </div>
            )}
          </div>
          {/* Manual fallback while camera is active */}
          <div className="absolute top-3 left-3 right-3">
            <div className="flex gap-1.5">
              <Input
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleManualSearch()}
                placeholder="Type order # here..."
                className="flex-1 h-9 text-sm bg-white/95 border-0 shadow-lg"
              />
              <Button onClick={handleManualSearch} size="sm" className="bg-red-600 hover:bg-red-700 h-9 shadow-lg">
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Input */}
      {mode === 'manual' && !matchedOrder && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              ref={manualInputRef}
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleManualSearch()}
              placeholder="Scan barcode or type order number (PD0596960, WC-1775482105614)..."
              className="flex-1 h-14 text-lg font-mono border-2 border-slate-300 focus:border-red-500"
              autoFocus
            />
            <Button onClick={handleManualSearch} className="bg-red-600 hover:bg-red-700 h-14 px-8">
              <Search className="w-6 h-6" />
            </Button>
          </div>
          <p className="text-xs text-slate-400">
            💡 USB/Bluetooth scanners auto-submit on scan. You can also type the order number (e.g. PD0596960) and press Enter.
          </p>
        </div>
      )}

      {/* Debug info when scan fails */}
      {lastScannedRaw && !matchedOrder && mode === 'manual' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
          <p className="font-semibold text-amber-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Last scanned value: <code className="bg-amber-100 px-2 py-0.5 rounded font-mono">{lastScannedRaw}</code>
          </p>
          <p className="text-amber-600 text-xs mt-1">
            {orders?.length || 0} orders loaded. If the order exists, try typing its exact order number.
          </p>
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
            <p>Use USB/Bluetooth scanner pointed at barcode, or type order number directly (e.g. PD0596960).</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-blue-700">Step 2: Verify</p>
            <p>Check customer name, address, items and stock levels before shipping.</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-emerald-700">Step 3: Ship</p>
            <p>Tap "Ship Order" — inventory is automatically deducted for all items.</p>
          </div>
        </div>
      </div>
    </div>
  );
}