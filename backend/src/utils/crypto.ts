import crypto from 'crypto';
import { env } from '../config/env';

// AES-256-GCM encryption for secrets at rest (integration API keys, tokens…).
// Stored format: base64(iv).base64(authTag).base64(ciphertext)
const ALGO = 'aes-256-gcm';
const key = Buffer.from(env.ENCRYPTION_KEY, 'utf8'); // ENCRYPTION_KEY must be exactly 32 chars

export function encryptSecret(plain: string): string {
  if (plain == null) return plain as any;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`;
}

export function decryptSecret(payload: string): string {
  if (!payload || !payload.includes('.')) return payload; // not encrypted / legacy plaintext
  try {
    const [ivB64, tagB64, dataB64] = payload.split('.');
    const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]);
    return dec.toString('utf8');
  } catch {
    return ''; // tampered or wrong key
  }
}

// Mask a secret for display (show last 4 only).
export function maskSecret(plain: string): string {
  if (!plain) return '';
  const s = String(plain);
  return s.length <= 4 ? '••••' : `••••${s.slice(-4)}`;
}

// Constant-time string comparison for device keys / webhook secrets.
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
