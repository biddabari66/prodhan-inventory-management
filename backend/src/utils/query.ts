/**
 * Extract a single string value from an Express query param
 * (query params can be string | string[] | ParsedQs)
 */
export function qs(val: unknown): string | undefined {
  if (val === undefined || val === null) return undefined;
  if (Array.isArray(val)) return String(val[0]);
  return String(val);
}

/**
 * Parse a query param as a number
 */
export function qn(val: unknown, defaultVal: number): number {
  const s = qs(val);
  if (!s) return defaultVal;
  const n = parseInt(s, 10);
  return isNaN(n) ? defaultVal : n;
}

/**
 * Generate a short random alphanumeric ID
 */
export function shortId(prefix: string = ''): string {
  return `${prefix}${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
}

/**
 * UPC-A check digit for an 11-digit string.
 */
function upcaCheckDigit(digits11: string): number {
  const d = digits11.split('').map(Number);
  const sum = d.reduce((s, n, i) => s + n * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10;
}

/**
 * Build a scannable 12-digit UPC-A barcode from an order number.
 * Mirrors the frontend BarcodeGenerator.generateOrderBarcode so the printed
 * receipt barcode and the stored value match exactly.
 */
export function orderBarcode(orderNumber: string): string {
  const numeric = (orderNumber || '').replace(/\D/g, '');
  const padded = numeric.padStart(11, '0').slice(0, 11);
  return padded + upcaCheckDigit(padded);
}
