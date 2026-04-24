import { argon2id } from 'hash-wasm';

const VERSION = 'v1';
const SALT_LEN = 16;
const IV_LEN = 12;
const KEY_LEN = 32;

const ARGON2_PARAMS = {
  parallelism: 1,
  memorySize: 19456,
  iterations: 2,
  hashLength: KEY_LEN,
} as const;

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

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const rawKey = await argon2id({
    password,
    salt,
    ...ARGON2_PARAMS,
    outputType: 'binary',
  });
  const keyBytes = new Uint8Array(rawKey.length);
  keyBytes.set(rawKey);
  return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptSecret(plaintext: string, password: string): Promise<string> {
  if (!plaintext) throw new Error('empty plaintext');
  if (!password) throw new Error('empty password');

  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const key = await deriveKey(password, salt);

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, enc.encode(plaintext))
  );

  const payload = new Uint8Array(SALT_LEN + IV_LEN + ciphertext.length);
  payload.set(salt, 0);
  payload.set(iv, SALT_LEN);
  payload.set(ciphertext, SALT_LEN + IV_LEN);

  return `${VERSION}.${base64urlEncode(payload)}`;
}

export async function decryptSecret(fragment: string, password: string): Promise<string> {
  const cleaned = fragment.startsWith('#') ? fragment.slice(1) : fragment;
  const dot = cleaned.indexOf('.');
  if (dot < 0) throw new Error('invalid payload: missing version');

  const version = cleaned.slice(0, dot);
  if (version !== VERSION) throw new Error(`unsupported version: ${version}`);

  const payload = base64urlDecode(cleaned.slice(dot + 1));
  if (payload.length < SALT_LEN + IV_LEN + 16) throw new Error('payload too short');

  const salt = payload.slice(0, SALT_LEN);
  const iv = payload.slice(SALT_LEN, SALT_LEN + IV_LEN);
  const ciphertext = payload.slice(SALT_LEN + IV_LEN);

  const key = await deriveKey(password, salt);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, tagLength: 128 }, key, ciphertext);
  return dec.decode(plain);
}

export function hasFragmentPayload(): boolean {
  const h = window.location.hash;
  return h.length > 2 && h.slice(1).includes('.');
}

export function getFragment(): string {
  return window.location.hash.slice(1);
}
