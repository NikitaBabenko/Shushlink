import { argon2id } from 'hash-wasm';

const VERSION = 'v1';
const HEADER_LEN = 4;
const SALT_LEN = 16;
const IV_LEN = 12;
const KEY_LEN = 32;
const TAG_LEN_BITS = 128;
const GCM_TAG_BYTES = 16;

export interface KdfParams {
  memorySize: number;
  iterations: number;
  parallelism: number;
}

export const DEFAULT_KDF_PARAMS: KdfParams = {
  memorySize: 19456,
  iterations: 2,
  parallelism: 1,
};

const enc = new TextEncoder();
const dec = new TextDecoder();

function base64urlEncode(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64urlDecode(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function packHeader(p: KdfParams): Uint8Array {
  if (p.memorySize < 1 || p.memorySize > 0xffff) throw new Error('memorySize out of range');
  if (p.iterations < 1 || p.iterations > 0xff) throw new Error('iterations out of range');
  if (p.parallelism < 1 || p.parallelism > 0xff) throw new Error('parallelism out of range');
  const h = new Uint8Array(HEADER_LEN);
  h[0] = p.memorySize & 0xff;
  h[1] = (p.memorySize >> 8) & 0xff;
  h[2] = p.iterations & 0xff;
  h[3] = p.parallelism & 0xff;
  return h;
}

function unpackHeader(h: Uint8Array): KdfParams {
  const memorySize = h[0] | (h[1] << 8);
  const iterations = h[2];
  const parallelism = h[3];
  if (memorySize === 0 || iterations === 0 || parallelism === 0) {
    throw new Error('invalid kdf params');
  }
  return { memorySize, iterations, parallelism };
}

async function deriveKey(password: string, salt: Uint8Array, params: KdfParams): Promise<CryptoKey> {
  const rawKey = await argon2id({
    password,
    salt,
    parallelism: params.parallelism,
    memorySize: params.memorySize,
    iterations: params.iterations,
    hashLength: KEY_LEN,
    outputType: 'binary',
  });
  const keyBytes = new Uint8Array(rawKey.length);
  keyBytes.set(rawKey);
  return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptSecret(
  plaintext: string,
  password: string,
  params: KdfParams = DEFAULT_KDF_PARAMS
): Promise<string> {
  if (!plaintext) throw new Error('empty plaintext');
  if (!password) throw new Error('empty password');

  const header = packHeader(params);
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const key = await deriveKey(password, salt, params);

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: TAG_LEN_BITS }, key, enc.encode(plaintext))
  );

  const payload = new Uint8Array(HEADER_LEN + SALT_LEN + IV_LEN + ciphertext.length);
  payload.set(header, 0);
  payload.set(salt, HEADER_LEN);
  payload.set(iv, HEADER_LEN + SALT_LEN);
  payload.set(ciphertext, HEADER_LEN + SALT_LEN + IV_LEN);

  return `${VERSION}.${base64urlEncode(payload)}`;
}

export async function decryptSecret(fragment: string, password: string): Promise<string> {
  const cleaned = fragment.startsWith('#') ? fragment.slice(1) : fragment;
  const dot = cleaned.indexOf('.');
  if (dot < 0) throw new Error('invalid payload: missing version');

  const version = cleaned.slice(0, dot);
  if (version !== VERSION) throw new Error(`unsupported version: ${version}`);

  const payload = base64urlDecode(cleaned.slice(dot + 1));
  if (payload.length < HEADER_LEN + SALT_LEN + IV_LEN + GCM_TAG_BYTES) {
    throw new Error('invalid payload: too short');
  }

  const params = unpackHeader(payload.slice(0, HEADER_LEN));
  const salt = payload.slice(HEADER_LEN, HEADER_LEN + SALT_LEN);
  const iv = payload.slice(HEADER_LEN + SALT_LEN, HEADER_LEN + SALT_LEN + IV_LEN);
  const ciphertext = payload.slice(HEADER_LEN + SALT_LEN + IV_LEN);

  const key = await deriveKey(password, salt, params);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, tagLength: TAG_LEN_BITS }, key, ciphertext);
  return dec.decode(plain);
}

export function hasFragmentPayload(): boolean {
  const h = window.location.hash;
  return h.length > 2 && h.slice(1).includes('.');
}

export function getFragment(): string {
  return window.location.hash.slice(1);
}

export function estimatedFragmentLength(plaintextChars: string): number {
  const utf8Bytes = enc.encode(plaintextChars).length;
  const payloadBytes = HEADER_LEN + SALT_LEN + IV_LEN + utf8Bytes + GCM_TAG_BYTES;
  const base64Chars = Math.ceil((payloadBytes * 4) / 3);
  return VERSION.length + 1 + base64Chars;
}

export function estimatedTotalUrlLength(plaintext: string): number {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  return origin.length + path.length + 1 + estimatedFragmentLength(plaintext);
}
