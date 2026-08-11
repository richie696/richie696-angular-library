import { bytesToHex } from '@noble/hashes/utils.js';

import { hmacSha256, sha256Hex } from './hash';

describe('hash fallback helpers', () => {
  it('creates the standard SHA-256 hexadecimal digest', () => {
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('creates the standard HMAC-SHA256 bytes', () => {
    const signature = hmacSha256('key', 'The quick brown fox jumps over the lazy dog');

    expect(bytesToHex(signature)).toBe('f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8');
  });
});
