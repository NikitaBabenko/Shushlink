import { describe, expect, it } from 'vitest';
import {
  DEFAULT_KDF_PARAMS,
  decryptSecret,
  encryptSecret,
  estimatedFragmentLength,
  type KdfParams,
} from '../src/crypto';

const FAST_PARAMS: KdfParams = { memorySize: 512, iterations: 1, parallelism: 1 };

function base64urlDecode(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = Buffer.from(b64, 'base64');
  return new Uint8Array(bin);
}

describe('crypto', () => {
  it('roundtrips ASCII, cyrillic, and emoji', async () => {
    const password = 'correct horse battery staple';
    const cases = [
      'hello world',
      'Привет мир',
      'mixed 🤫 emoji and 𝕌𝕟𝕚𝕔𝕠𝕕𝕖',
      'a',
      'A'.repeat(1024),
    ];
    for (const plaintext of cases) {
      const fragment = await encryptSecret(plaintext, password, FAST_PARAMS);
      const decrypted = await decryptSecret(fragment, password);
      expect(decrypted).toBe(plaintext);
    }
  });

  it('rejects wrong password', async () => {
    const fragment = await encryptSecret('secret', 'right-password', FAST_PARAMS);
    await expect(decryptSecret(fragment, 'wrong-password')).rejects.toThrow();
  });

  it('rejects tampered ciphertext', async () => {
    const fragment = await encryptSecret('secret', 'pw', FAST_PARAMS);
    const idx = fragment.length - 4;
    const flipped = fragment.slice(0, idx) + (fragment[idx] === 'A' ? 'B' : 'A') + fragment.slice(idx + 1);
    await expect(decryptSecret(flipped, 'pw')).rejects.toThrow();
  });

  it('rejects tampered iv', async () => {
    const fragment = await encryptSecret('secret', 'pw', FAST_PARAMS);
    // IV bytes live at positions 4 (header) + 16 (salt) = 20..31 of payload
    const cleaned = fragment.slice(3);
    const payload = base64urlDecode(cleaned);
    payload[24] ^= 0x01;
    const tampered = 'v1.' + Buffer.from(payload).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    await expect(decryptSecret(tampered, 'pw')).rejects.toThrow();
  });

  it('rejects unsupported version', async () => {
    await expect(decryptSecret('v999.AAAAAAAAAAAA', 'pw')).rejects.toThrow(/unsupported version/);
  });

  it('rejects payload missing version separator', async () => {
    await expect(decryptSecret('garbage_no_dot', 'pw')).rejects.toThrow(/missing version/);
  });

  it('payload format integrity: header + salt + iv + ct(plaintext+tag)', async () => {
    const plaintext = 'hello';
    const fragment = await encryptSecret(plaintext, 'pw', FAST_PARAMS);
    expect(fragment.startsWith('v1.')).toBe(true);
    const payload = base64urlDecode(fragment.slice(3));
    const utf8Len = new TextEncoder().encode(plaintext).length;
    // 4 header + 16 salt + 12 iv + utf8Len plaintext + 16 GCM tag
    expect(payload.length).toBe(4 + 16 + 12 + utf8Len + 16);
  });

  it('embeds KDF params in payload header (default params)', async () => {
    const fragment = await encryptSecret('x', 'pw', DEFAULT_KDF_PARAMS);
    const payload = base64urlDecode(fragment.slice(3));
    // memorySize 19456 = 0x4C00 → little-endian [0x00, 0x4C]
    expect(payload[0]).toBe(0x00);
    expect(payload[1]).toBe(0x4c);
    expect(payload[2]).toBe(DEFAULT_KDF_PARAMS.iterations);
    expect(payload[3]).toBe(DEFAULT_KDF_PARAMS.parallelism);
  });

  it('decrypts with params recovered from header (params survive roundtrip)', async () => {
    const customParams: KdfParams = { memorySize: 1024, iterations: 3, parallelism: 1 };
    const fragment = await encryptSecret('migrated secret', 'pw', customParams);
    // decryptSecret takes only fragment + password — proves params came from payload
    const decrypted = await decryptSecret(fragment, 'pw');
    expect(decrypted).toBe('migrated secret');
  });

  it('rejects payload shorter than header + salt + iv + tag', async () => {
    // 4 + 16 + 12 + 16 = 48 bytes minimum; build a 47-byte payload
    const tooShort = new Uint8Array(47);
    tooShort[0] = 1; tooShort[2] = 1; tooShort[3] = 1; // valid-looking header
    const fragment = 'v1.' + Buffer.from(tooShort).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    await expect(decryptSecret(fragment, 'pw')).rejects.toThrow(/too short/);
  });

  it('rejects header with zero KDF params', async () => {
    // Construct payload with header [0,0,0,0] but otherwise plausible length
    const payload = new Uint8Array(4 + 16 + 12 + 16);
    const fragment = 'v1.' + Buffer.from(payload).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    await expect(decryptSecret(fragment, 'pw')).rejects.toThrow(/invalid kdf params/);
  });

  it('rejects header with KDF params above safe upper bound', async () => {
    // memorySize=1 (ok), iterations=255 (over MAX=10), parallelism=1
    const payload = new Uint8Array(4 + 16 + 12 + 16);
    payload[0] = 1; payload[1] = 0;
    payload[2] = 255;
    payload[3] = 1;
    const fragment = 'v1.' + Buffer.from(payload).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    await expect(decryptSecret(fragment, 'pw')).rejects.toThrow(/upper bound/);
  });

  it('estimatedFragmentLength matches actual fragment length within rounding', async () => {
    const plaintext = 'predictable length test';
    const fragment = await encryptSecret(plaintext, 'pw', FAST_PARAMS);
    const estimated = estimatedFragmentLength(plaintext);
    // base64url ceil rounding can over-estimate by at most 1 char vs actual
    expect(Math.abs(fragment.length - estimated)).toBeLessThanOrEqual(1);
  });
});
