// Deep conversion between the Base44-style snake_case shapes the frontend
// expects and the camelCase shapes the Prisma/Express backend uses.
//
// Special aliases bridge Base44 timestamp conventions:
//   backend createdAt  <-> frontend created_date
//   backend updatedAt  <-> frontend updated_date

const SNAKE_TO_CAMEL_ALIAS = {
  created_date: 'createdAt',
  updated_date: 'updatedAt',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
};

const snakeToCamel = (str) =>
  str.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

const camelToSnake = (str) =>
  str.replace(/([A-Z])/g, (m) => `_${m.toLowerCase()}`);

const isPlainObject = (v) =>
  v !== null &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  !(v instanceof Date) &&
  !(typeof File !== 'undefined' && v instanceof File) &&
  !(typeof Blob !== 'undefined' && v instanceof Blob);

/** Request payload: frontend snake_case -> backend camelCase */
export function toBackend(input) {
  if (Array.isArray(input)) return input.map(toBackend);
  if (!isPlainObject(input)) return input;

  const out = {};
  for (const [key, value] of Object.entries(input)) {
    const mapped = SNAKE_TO_CAMEL_ALIAS[key] || snakeToCamel(key);
    out[mapped] = toBackend(value);
  }
  return out;
}

/** Response payload: backend camelCase -> frontend snake_case (+ date aliases) */
export function toFrontend(input) {
  if (Array.isArray(input)) return input.map(toFrontend);
  if (!isPlainObject(input)) return input;

  const out = {};
  for (const [key, value] of Object.entries(input)) {
    const snake = camelToSnake(key);
    out[snake] = toFrontend(value);

    // Provide Base44 timestamp aliases alongside the snake versions.
    if (key === 'createdAt') out.created_date = toFrontend(value);
    if (key === 'updatedAt') out.updated_date = toFrontend(value);
  }
  // Always keep a raw `id`
  if (input.id !== undefined) out.id = input.id;
  return out;
}
