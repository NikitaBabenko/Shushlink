import { describe, expect, it } from 'vitest';
import { generatePassword } from '../src/password';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

describe('generatePassword', () => {
  // Each call uses crypto.getRandomValues(), a CSPRNG mandated by the Web Crypto
  // spec to be unpredictable. Different page loads, different tabs, different
  // devices — all draw independently. This test sanity-checks the property
  // within a single process; the cross-device guarantee is by spec.
  it('produces unique passwords across many calls (no shared state)', () => {
    const N = 1000;
    const set = new Set<string>();
    for (let i = 0; i < N; i++) set.add(generatePassword(24));
    expect(set.size).toBe(N);
  });

  it('honors the requested length', () => {
    expect(generatePassword(8)).toHaveLength(8);
    expect(generatePassword(24)).toHaveLength(24);
    expect(generatePassword(64)).toHaveLength(64);
  });

  it('only emits characters from the documented alphabet', () => {
    const allowed = new RegExp(`^[${ALPHABET}]+$`);
    for (let i = 0; i < 50; i++) {
      expect(generatePassword(24)).toMatch(allowed);
    }
  });

  it('exercises the full 57-char alphabet across many samples', () => {
    // 24 chars × 200 samples = 4800 picks from 57 symbols.
    // P(any given symbol never appears) = (56/57)^4800 ≈ 10^-37 — effectively 0.
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      for (const c of generatePassword(24)) seen.add(c);
    }
    expect(seen.size).toBe(ALPHABET.length);
  });
});
