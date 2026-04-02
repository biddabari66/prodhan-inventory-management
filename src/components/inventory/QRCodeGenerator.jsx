import React, { useRef, useEffect, useState } from 'react';
import QRCode from 'qrcode';

/**
 * QR Code Generator using the `qrcode` npm package.
 * 
 * Settings for reliable scanning (Google Lens, iPhone Camera, etc.):
 * - errorCorrectionLevel: 'H' (30% damage tolerance)
 * - margin: 4 (QR spec standard quiet zone)
 * - High contrast: pure black on pure white
 */

const QR_OPTIONS = {
  errorCorrectionLevel: 'H',
  margin: 4,
  color: { dark: '#000000', light: '#FFFFFF' },
};

// Canvas-based QR code for on-screen display
export function QRCodeCanvas({ value, size = 150, className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    QRCode.toCanvas(canvasRef.current, String(value), {
      ...QR_OPTIONS,
      width: size,
    }).catch((err) => console.error('QR render error:', err));
  }, [value, size]);

  if (!value) {
    return (
      <div className={className} style={{ width: size, height: size, background: '#f1f5f9', borderRadius: 8 }} />
    );
  }

  return <canvas ref={canvasRef} className={className} />;
}

// Generate QR as PNG data URL (for printing)
export async function generateQRDataURL(value, size = 300) {
  if (!value) return '';
  return QRCode.toDataURL(String(value), {
    ...QR_OPTIONS,
    width: size,
    type: 'image/png',
  });
}

// Determine what to encode in QR for an inventory item
// Priority: barcode > isbn > id
export function getQRValue(item) {
  if (!item) return '';
  return item.barcode || item.isbn || item.id || '';
}

export default QRCodeCanvas;