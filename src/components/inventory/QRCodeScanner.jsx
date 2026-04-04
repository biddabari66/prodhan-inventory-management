import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Camera, Package, Search, ScanLine, Keyboard, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import jsQR from 'jsqr';
import { extractCodeFromScan } from './QRCodeGenerator';

const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;

export default function QRCodeScanner({ inventory, onProductFound, onClose, open }) {
  const [mode, setMode] = useState('camera');
  const [manualCode, setManualCode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [matchedProduct, setMatchedProduct] = useState(null);
  const [scanStatus, setScanStatus] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const scanningRef = useRef(false);
  const barcodeDetectorRef = useRef(null);
  const lastDetectTimeRef = useRef(0);

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
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const handleCodeDetected = useCallback((rawValue) => {
    stopCamera();
    const code = extractCodeFromScan(rawValue);
    const product = findProduct(code);
    if (product) {
      setMatchedProduct(product);
      toast.success(`Product found: ${product.item_name}`);
    } else {
      toast.error(`No product found for code: ${code}`);
      setMatchedProduct(null);
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

    // 1. Try jsQR for QR codes
    const imageData = ctx.getImageData(0, 0, w, h);
    const qrResult = jsQR(imageData.data, w, h, { inversionAttempts: 'attemptBoth' });
    if (qrResult && qrResult.data) {
      setScanStatus('QR Code detected!');
      handleCodeDetected(qrResult.data);
      return;
    }

    // 2. Try BarcodeDetector for barcodes (throttled to every 300ms)
    const now = Date.now();
    if (hasBarcodeDetector && now - lastDetectTimeRef.current > 300) {
      lastDetectTimeRef.current = now;
      if (!barcodeDetectorRef.current) {
        barcodeDetectorRef.current = new window.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'itf', 'codabar', 'qr_code']
        });
      }
      barcodeDetectorRef.current.detect(video).then(barcodes => {
        if (!scanningRef.current) return;
        if (barcodes.length > 0) {
          setScanStatus(`${barcodes[0].format.toUpperCase()} detected!`);
          handleCodeDetected(barcodes[0].rawValue);
        }
      }).catch(() => {});
    }

    animFrameRef.current = requestAnimationFrame(scanLoop);
  }, [handleCodeDetected]);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
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
    } catch (err) {
      setCameraError(err.name === 'NotAllowedError'
        ? 'Camera permission denied. Please allow camera access.'
        : 'Camera not available. Use manual entry instead.');
      setMode('manual');
    }
  }, [stopCamera, scanLoop]);

  useEffect(() => {
    if (open && mode === 'camera') {
      startCamera();
    }
    if (!open) {
      stopCamera();
    }
    return () => stopCamera();
  }, [open, mode]);

  const handleManualSearch = () => {
    if (!manualCode.trim()) return;
    const product = findProduct(manualCode);
    if (product) {
      setMatchedProduct(product);
      toast.success(`Product found: ${product.item_name}`);
    } else {
      toast.error(`No product matches "${manualCode}"`);
    }
  };

  const handleSelectProduct = () => {
    if (matchedProduct && onProductFound) {
      onProductFound(matchedProduct);
      handleClose();
    }
  };

  const handleClose = () => {
    stopCamera();
    setMatchedProduct(null);
    setManualCode('');
    setCameraError(null);
    setScanStatus('');
    barcodeDetectorRef.current = null;
    if (onClose) onClose();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ScanLine className="w-5 h-5 text-red-600" />
            QR / Barcode Scanner
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4">
          <div className="flex gap-2">
            <Button variant={mode === 'camera' ? 'default' : 'outline'} size="sm"
              onClick={() => { setMode('camera'); setMatchedProduct(null); }}
              className={mode === 'camera' ? 'bg-red-600 hover:bg-red-700' : ''}>
              <Camera className="w-4 h-4 mr-1" /> Camera Scan
            </Button>
            <Button variant={mode === 'manual' ? 'default' : 'outline'} size="sm"
              onClick={() => { stopCamera(); setMode('manual'); setMatchedProduct(null); }}
              className={mode === 'manual' ? 'bg-red-600 hover:bg-red-700' : ''}>
              <Keyboard className="w-4 h-4 mr-1" /> Manual Entry
            </Button>
          </div>

          {mode === 'camera' && !matchedProduct && (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-56 h-56 border-2 border-white/60 rounded-2xl relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-red-500 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-red-500 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-red-500 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-red-500 rounded-br-lg" />
                  <div className="absolute left-2 right-2 h-0.5 bg-red-500 animate-bounce" style={{ top: '50%' }} />
                </div>
              </div>
              <div className="absolute bottom-3 left-0 right-0 text-center">
                <Badge className="bg-black/60 text-white border-0 px-3 py-1">
                  {scanStatus || (cameraActive ? 'Point camera at QR code or barcode...' : 'Starting camera...')}
                </Badge>
                {cameraActive && (
                  <div className="mt-1.5 flex items-center justify-center gap-1.5">
                    <Badge variant="outline" className="bg-black/50 text-white/80 border-white/20 text-[10px] px-2 py-0.5">QR</Badge>
                    <Badge variant="outline" className="bg-black/50 text-white/80 border-white/20 text-[10px] px-2 py-0.5">EAN-13</Badge>
                    <Badge variant="outline" className="bg-black/50 text-white/80 border-white/20 text-[10px] px-2 py-0.5">Code-128</Badge>
                    <Badge variant="outline" className="bg-black/50 text-white/80 border-white/20 text-[10px] px-2 py-0.5">UPC</Badge>
                    {!hasBarcodeDetector && <Badge variant="outline" className="bg-yellow-500/60 text-white border-white/20 text-[10px] px-2 py-0.5">QR only</Badge>}
                  </div>
                )}
              </div>
              {cameraError && (
                <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-6">
                  <div className="text-center text-white space-y-3">
                    <AlertCircle className="w-10 h-10 mx-auto text-red-400" />
                    <p className="text-sm">{cameraError}</p>
                    <Button size="sm" variant="outline" className="text-white border-white" onClick={() => setMode('manual')}>
                      Use Manual Entry
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === 'manual' && !matchedProduct && (
            <Card className="border-2 border-dashed border-slate-300">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm text-slate-600 font-medium">Enter the product barcode, ISBN, or SKU code:</p>
                <div className="flex gap-2">
                  <Input value={manualCode} onChange={e => setManualCode(e.target.value)}
                    placeholder="Scan or type barcode / ISBN / SKU..."
                    className="flex-1" autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleManualSearch()} />
                  <Button onClick={handleManualSearch} className="bg-red-600 hover:bg-red-700">
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-slate-400">
                  Tip: USB/Bluetooth barcode scanners type the code and press Enter automatically
                </p>
              </CardContent>
            </Card>
          )}

          {matchedProduct && (
            <Card className="border-2 border-green-300 bg-green-50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-green-700 font-semibold">
                  <Package className="w-5 h-5" /> Product Found!
                </div>
                <div className="bg-white rounded-lg p-3 border border-green-200 space-y-2">
                  <p className="font-bold text-slate-900 text-lg" style={{ fontFamily: "'Anek Bangla', sans-serif" }}>
                    {matchedProduct.item_name}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-slate-500">Category:</span>
                      <Badge className="ml-2 bg-slate-100 text-slate-700">{matchedProduct.category}</Badge>
                    </div>
                    <div>
                      <span className="text-slate-500">Stock:</span>
                      <span className="ml-2 font-bold text-slate-900">{matchedProduct.current_stock}</span>
                    </div>
                    {matchedProduct.barcode && <div><span className="text-slate-500">SKU:</span><span className="ml-2 font-mono text-xs">{matchedProduct.barcode}</span></div>}
                    {matchedProduct.isbn && <div><span className="text-slate-500">ISBN:</span><span className="ml-2 font-mono text-xs">{matchedProduct.isbn}</span></div>}
                    <div>
                      <span className="text-slate-500">Selling:</span>
                      <span className="ml-2 font-bold text-green-700">৳{(matchedProduct.selling_price || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Min Stock:</span>
                      <span className="ml-2">{matchedProduct.minimum_stock}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSelectProduct} className="flex-1 bg-green-600 hover:bg-green-700">
                    <Package className="w-4 h-4 mr-2" /> Open Product Details
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setMatchedProduct(null);
                    setManualCode('');
                    if (mode === 'camera') startCamera();
                  }}>
                    Scan Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="bg-slate-50 rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">📖 How to use</p>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>• <strong>Camera Scan:</strong> Point your camera at a QR code or barcode (EAN-13, Code-128, UPC, etc.)</li>
              <li>• <strong>Manual Entry:</strong> Type or scan a barcode/ISBN/SKU using a USB/Bluetooth scanner</li>
              <li>• Products are matched by barcode, ISBN, SKU, or internal ID</li>
              {!hasBarcodeDetector && <li className="text-amber-600">• ⚠️ Your browser doesn't support barcode detection — only QR codes work via camera. Use manual entry for barcodes.</li>}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}