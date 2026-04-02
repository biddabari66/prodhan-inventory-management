import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Camera, X, Package, Search, ScanLine, Keyboard, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import jsQR from 'jsqr';

export default function QRCodeScanner({ inventory, onProductFound, onClose, open }) {
  const [mode, setMode] = useState('camera'); // 'camera' | 'manual'
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [matchedProduct, setMatchedProduct] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);

  // Find product by barcode, ISBN, or ID
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

  // Start camera
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScanning(true);
        scanFrame();
      }
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError(err.name === 'NotAllowedError'
        ? 'Camera permission denied. Please allow camera access.'
        : 'Camera not available. Use manual entry instead.');
      setMode('manual');
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    setScanning(false);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // Scan each video frame using jsQR for universal QR detection
  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !scanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Use jsQR for universal cross-browser QR scanning
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const qrResult = jsQR(imageData.data, canvas.width, canvas.height, { inversionAttempts: 'dontInvert' });
    if (qrResult && qrResult.data) {
      handleCodeDetected(qrResult.data);
      return;
    }

    animFrameRef.current = requestAnimationFrame(scanFrame);
  }, [scanning]);

  const handleCodeDetected = useCallback((code) => {
    setScanning(false);
    stopCamera();

    const product = findProduct(code);
    if (product) {
      setMatchedProduct(product);
      toast.success(`Product found: ${product.item_name}`);
    } else {
      toast.error(`No product found for code: ${code}`);
      setMatchedProduct(null);
      // Resume scanning after 2s
      setTimeout(() => {
        if (mode === 'camera') startCamera();
      }, 2000);
    }
  }, [findProduct, stopCamera, startCamera, mode]);

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
    if (onClose) onClose();
  };

  useEffect(() => {
    if (open && mode === 'camera') {
      startCamera();
    }
    return () => stopCamera();
  }, [open, mode]);

  useEffect(() => {
    if (scanning) scanFrame();
  }, [scanning, scanFrame]);

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
          {/* Mode Toggle */}
          <div className="flex gap-2">
            <Button
              variant={mode === 'camera' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setMode('camera'); setMatchedProduct(null); }}
              className={mode === 'camera' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              <Camera className="w-4 h-4 mr-1" /> Camera Scan
            </Button>
            <Button
              variant={mode === 'manual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { stopCamera(); setMode('manual'); setMatchedProduct(null); }}
              className={mode === 'manual' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              <Keyboard className="w-4 h-4 mr-1" /> Manual Entry
            </Button>
          </div>

          {/* Camera View */}
          {mode === 'camera' && !matchedProduct && (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Scan overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-56 h-56 border-2 border-white/60 rounded-2xl relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-red-500 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-red-500 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-red-500 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-red-500 rounded-br-lg" />
                  {/* Animated scan line */}
                  <div className="absolute left-2 right-2 h-0.5 bg-red-500 animate-bounce" style={{ top: '50%' }} />
                </div>
              </div>

              {/* Status */}
              <div className="absolute bottom-3 left-0 right-0 text-center">
                <Badge className="bg-black/60 text-white border-0 px-3 py-1">
                  {scanning ? 'Point camera at barcode or QR code...' : 'Initializing camera...'}
                </Badge>
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

          {/* Manual Entry */}
          {mode === 'manual' && !matchedProduct && (
            <Card className="border-2 border-dashed border-slate-300">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm text-slate-600 font-medium">
                  Enter the product barcode, ISBN, or SKU code:
                </p>
                <div className="flex gap-2">
                  <Input
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Scan or type barcode / ISBN / SKU..."
                    className="flex-1"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                  />
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

          {/* Matched Product */}
          {matchedProduct && (
            <Card className="border-2 border-green-300 bg-green-50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-green-700 font-semibold">
                  <Package className="w-5 h-5" />
                  Product Found!
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
                    {matchedProduct.barcode && (
                      <div>
                        <span className="text-slate-500">SKU:</span>
                        <span className="ml-2 font-mono text-xs">{matchedProduct.barcode}</span>
                      </div>
                    )}
                    {matchedProduct.isbn && (
                      <div>
                        <span className="text-slate-500">ISBN:</span>
                        <span className="ml-2 font-mono text-xs">{matchedProduct.isbn}</span>
                      </div>
                    )}
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
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMatchedProduct(null);
                      setManualCode('');
                      if (mode === 'camera') startCamera();
                    }}
                  >
                    Scan Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Usage Guide */}
          <div className="bg-slate-50 rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">📖 How to use</p>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>• <strong>Camera Scan:</strong> Point your camera at a product barcode or QR code</li>
              <li>• <strong>Manual Entry:</strong> Type or scan a barcode/ISBN/SKU using a USB barcode scanner</li>
              <li>• <strong>Supported codes:</strong> QR, EAN-13, EAN-8, Code 128, Code 39, UPC</li>
              <li>• Products are matched by barcode, ISBN, or SKU fields in inventory</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}