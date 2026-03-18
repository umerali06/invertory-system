import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cleanString } from '@/lib/utils';

const TOTP_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derivedKey}`;
}

export function verifyPassword(password: string, storedHash?: string) {
  if (!storedHash) {
    return false;
  }

  if (!storedHash.startsWith('scrypt$')) {
    const legacyHash = Buffer.from(password).toString('base64');
    return storedHash === legacyHash || storedHash === password;
  }

  const [, salt, key] = storedHash.split('$');
  if (!salt || !key) {
    return false;
  }

  const derivedKey = scryptSync(password, salt, 64);
  const storedBuffer = Buffer.from(key, 'hex');
  if (derivedKey.length !== storedBuffer.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, storedBuffer);
}

export function generateBase32Secret(length = 32) {
  let secret = '';
  const bytes = randomBytes(length);

  for (let index = 0; index < length; index += 1) {
    secret += TOTP_ALPHABET[bytes[index] % TOTP_ALPHABET.length];
  }

  return secret;
}

export function generateSecureToken(size = 32) {
  return randomBytes(size).toString('hex');
}

export function hashToken(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function decodeBase32(secret: string) {
  const normalized = cleanString(secret).replace(/=+$/g, '').toUpperCase();
  let bits = '';

  for (const char of normalized) {
    const value = TOTP_ALPHABET.indexOf(char);
    if (value === -1) {
      throw new Error('Invalid two-factor secret.');
    }
    bits += value.toString(2).padStart(5, '0');
  }

  const bytes = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }

  return Buffer.from(bytes);
}

export function generateTotpCode(secret: string, timestamp = Date.now()) {
  const key = decodeBase32(secret);
  const counter = Math.floor(timestamp / 30_000);
  const buffer = Buffer.alloc(8);

  buffer.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  buffer.writeUInt32BE(counter >>> 0, 4);

  const hmac = createHmac('sha1', key).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(binary % 1_000_000).padStart(6, '0');
}

export function verifyTotpCode(secret: string, code: string) {
  const normalizedCode = cleanString(code);
  if (!/^\d{6}$/.test(normalizedCode)) {
    return false;
  }

  const now = Date.now();
  const offsets = [-30_000, 0, 30_000];
  return offsets.some((offset) => generateTotpCode(secret, now + offset) === normalizedCode);
}

export function buildOtpAuthUri(email: string, secret: string, issuer = 'Shopline Inventory') {
  const label = encodeURIComponent(`${issuer}:${email}`);
  const issuerParam = encodeURIComponent(issuer);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuerParam}&algorithm=SHA1&digits=6&period=30`;
}
