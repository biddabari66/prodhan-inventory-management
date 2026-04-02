import React, { useRef, useEffect } from 'react';
import QRCode from 'qrcode';

/**
 * Real QR Code Generator using the `qrcode` npm package.
 * 
 * KEY SETTINGS for reliable scanning (Google Lens, iPhone Camera, etc.):
 * - errorCorrectionLevel: 'H' (30% damage tolerance — best for printed labels)
 * - margin: 4 (standard quiet zone — required by QR spec for reliable detection)
 * - width: large enough for the display/print context
 * - High contrast: pure black on pure white
 */

const QR_OPTIONS_BASE = {
  errorCorrectionLevel: 'H',  // Highest error correction for printed labels
  margin: 4,                   // QR spec requires minimum 4-module quiet zone
  color: {
    dark: '#000000',
    light: '#FFFFFF',
  },
};

// Canvas-based QR code component for on-screen display
export function QRCodeCanvas({ value, size = 150, className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    QRCode.toCanvas(canvasRef.current, String(value), {
      ...QR_OPTIONS_BASE,
      width: size,
    }).catch((err) => console.error('QR render error:', err));
  }, [value, size]);

  if (!value) {
    return (
      <div
        className={className}
        style={{ width: size, height: size, background: '#f1f5f9', borderRadius: 8 }}
      />
    );
  }

  return <canvas ref={canvasRef} className={className} />;
}

// Generate QR code as a PNG data URL (for printing / embedding in HTML)
export async function generateQRDataURL(value, size = 300) {
  if (!value) return '';
  return QRCode.toDataURL(String(value), {
    ...QR_OPTIONS_BASE,
    width: size,
    type: 'image/png',
  });
}

// Alias for backward compat
export function generateQRDataURLSync(value, size = 300) {
  return generateQRDataURL(value, size);
}

// Determine what value to encode in the QR code for an inventory item.
// Priority: barcode > isbn > id
export function getQRValue(item) {
  if (!item) return '';
  return item.barcode || item.isbn || item.id || '';
}

export default QRCodeCanvas;