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

// The base URL for QR codes — when scanned externally, opens the app's product lookup page
const APP_BASE_URL = window.location.origin;

// Get the raw identifier for an inventory item (barcode > isbn > id)
export function getItemCode(item) {
  if (!item) return '';
  return item.barcode || item.isbn || item.id || '';
}

// Build a full URL for QR encoding so external scanners (Google Lens, iPhone Camera) open the app
export function getQRValue(item) {
  const code = getItemCode(item);
  if (!code) return '';
  return `${APP_BASE_URL}/QRInventory?code=${encodeURIComponent(code)}`;
}

// Extract the raw product code from a scanned QR value
// Handles both: full URLs (from our QR stickers) and raw codes (typed/barcode scanner)
export function extractCodeFromScan(scannedValue) {
  if (!scannedValue) return '';
  try {
    const url = new URL(scannedValue);
    const code = url.searchParams.get('code');
    if (code) return code;
  } catch {
    // Not a URL — treat as raw code
  }
  return scannedValue.trim();
}

export default QRCodeCanvas;