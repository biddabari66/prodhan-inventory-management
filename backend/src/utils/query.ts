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
