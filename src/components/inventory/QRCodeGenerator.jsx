import React, { useRef, useEffect, useState } from 'react';
import QRCode from 'qrcode';

// Real QR code component using the `qrcode` npm package
// Generates actual scannable QR codes on canvas

export function QRCodeCanvas({ value, size = 150, className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    QRCode.toCanvas(canvasRef.current, String(value), {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#FFFFFF' }
    }).catch(() => {});
  }, [value, size]);

  if (!value) {
    return <div className={className} style={{ width: size, height: size, background: '#f1f5f9' }} />;
  }

  return <canvas ref={canvasRef} className={className} />;
}

// Generate QR as data URL string for printing
export async function generateQRDataURL(value, size = 200) {
  if (!value) return '';
  return QRCode.toDataURL(String(value), {
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M',
  });
}

// Synchronous wrapper that returns a promise — used by QRStickerSheet
// For backward compat, also export a sync version that callers can await
export function generateQRDataURLSync(value, size = 200) {
  return generateQRDataURL(value, size);
}

// Get the QR code value for an inventory item
export function getQRValue(item) {
  return item.barcode || item.isbn || item.id || '';
}

export default QRCodeCanvas;