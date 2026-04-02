import React from 'react';

// Real QR code generator using qrserver.com API
// Generates actual scannable QR codes

function getQRImageUrl(value, size = 150) {
  if (!value) return '';
  const encoded = encodeURIComponent(value);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&margin=4&format=png`;
}

export function QRCodeCanvas({ value, size = 150, className = '' }) {
  if (!value) return <div className={className} style={{ width: size, height: size, background: '#f1f5f9' }} />;
  
  return (
    <img
      src={getQRImageUrl(value, size)}
      alt={`QR: ${value}`}
      width={size}
      height={size}
      className={className}
      style={{ imageRendering: 'pixelated' }}
      crossOrigin="anonymous"
    />
  );
}

// Generate QR as data URL for printing — uses the API URL directly
// For print contexts, we use the img URL directly (browsers handle it)
export function generateQRDataURL(value, size = 200) {
  return getQRImageUrl(value, size);
}

// Get the QR code value for an inventory item
export function getQRValue(item) {
  // Use barcode/ISBN if available, else use ID
  return item.barcode || item.isbn || item.id || '';
}

export default QRCodeCanvas;