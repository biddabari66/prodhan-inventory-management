import React, { useMemo } from 'react';

/**
 * Generates a UPC-A compatible barcode as an SVG.
 * Also provides utility functions for auto-generating product & order barcodes.
 * 
 * UPC-A encoding: 12 digits (11 data + 1 check digit)
 * For products: PD + 9 digit timestamp-based + check digit
 * For orders: Uses order_number encoded as digits
 */

// UPC-A encoding patterns (L = left, R = right)
const L_PATTERNS = [
  '0001101', '0011001', '0010011', '0111101', '0100011',
  '0110001', '0101111', '0111011', '0110111', '0001011'
];
const R_PATTERNS = [
  '1110010', '1100110', '1101100', '1000010', '1011100',
  '1001110', '1010000', '1000100', '1001000', '1110100'
];

// Calculate UPC-A check digit
export function calcCheckDigit(digits11) {
  const d = digits11.split('').map(Number);
  const sum = d.reduce((s, n, i) => s + n * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10;
}

// Generate a unique 12-digit UPC-A code for a product
export function generateProductBarcode() {
  const prefix = '2'; // UPC prefix 2 = internal use (perfect for private barcodes)
  const ts = Date.now().toString().slice(-8);
  const rand = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  const partial = (prefix + ts + rand).slice(0, 11);
  const check = calcCheckDigit(partial);
  return partial + check;
}

// Generate a scannable barcode string from an order number
// Converts PD020483 → 12-digit UPC-A
export function generateOrderBarcode(orderNumber) {
  if (!orderNumber) return '';
  // Strip non-numeric, pad to 11 digits
  const numericPart = orderNumber.replace(/\D/g, '');
  const padded = numericPart.padStart(11, '0').slice(0, 11);
  const check = calcCheckDigit(padded);
  return padded + check;
}

// Encode UPC-A digits to binary string
function encodeUPCA(digits12) {
  const d = digits12.split('').map(Number);
  let bits = '101'; // start guard
  for (let i = 0; i < 6; i++) bits += L_PATTERNS[d[i]];
  bits += '01010'; // center guard
  for (let i = 6; i < 12; i++) bits += R_PATTERNS[d[i]];
  bits += '101'; // end guard
  return bits;
}

/**
 * Renders a UPC-A barcode as inline SVG.
 * @param {string} value - 12-digit UPC-A string
 * @param {number} width - total SVG width in px
 * @param {number} height - bar height in px
 * @param {boolean} showText - show digits below barcode
 */
export default function BarcodeGenerator({ value, width = 200, height = 50, showText = true, className = '' }) {
  const svg = useMemo(() => {
    if (!value || value.length !== 12 || !/^\d{12}$/.test(value)) return null;
    
    const bits = encodeUPCA(value);
    const barCount = bits.length; // 95 modules
    const moduleWidth = width / barCount;
    
    const bars = [];
    for (let i = 0; i < bits.length; i++) {
      if (bits[i] === '1') {
        bars.push(
          <rect key={i} x={i * moduleWidth} y={0} width={moduleWidth + 0.5} height={height} fill="black" />
        );
      }
    }
    
    return { bars, moduleWidth, barCount };
  }, [value, width, height]);

  if (!svg) {
    return (
      <div className={`flex items-center justify-center text-xs text-red-500 ${className}`} style={{ width, height: height + (showText ? 16 : 0) }}>
        Invalid barcode
      </div>
    );
  }

  const totalHeight = height + (showText ? 18 : 0);

  return (
    <svg width={width} height={totalHeight} viewBox={`0 0 ${width} ${totalHeight}`} className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width={width} height={totalHeight} fill="white" />
      {svg.bars}
      {showText && (
        <text x={width / 2} y={height + 14} textAnchor="middle" fontSize="10" fontFamily="monospace" fill="black">
          {value}
        </text>
      )}
    </svg>
  );
}

/**
 * Returns a data URL of the barcode SVG for embedding in print HTML.
 */
export function getBarcodeDataURL(value, width = 200, height = 50, showText = true) {
  if (!value || value.length !== 12 || !/^\d{12}$/.test(value)) return '';
  
  const bits = encodeUPCA(value);
  const moduleWidth = width / bits.length;
  
  let rects = '';
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') {
      rects += `<rect x="${i * moduleWidth}" y="0" width="${moduleWidth + 0.5}" height="${height}" fill="black"/>`;
    }
  }

  const totalHeight = height + (showText ? 18 : 0);
  const textEl = showText 
    ? `<text x="${width / 2}" y="${height + 14}" text-anchor="middle" font-size="10" font-family="monospace" fill="black">${value}</text>`
    : '';
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${totalHeight}" viewBox="0 0 ${width} ${totalHeight}"><rect width="${width}" height="${totalHeight}" fill="white"/>${rects}${textEl}</svg>`;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}