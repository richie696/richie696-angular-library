import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

/**
 * 在无法使用 Web Crypto 的运行环境中提供同步 SHA-256 降级。
 *
 * `@noble/hashes` 是 ESM-only 且可按需 tree-shake，避免把 CommonJS
 * 哈希实现带入 Angular 的生产构建。调用方仍应优先使用 `crypto.subtle`。
 */
export function sha256Hex(value: string): string {
  return bytesToHex(sha256(utf8ToBytes(value)));
}

/**
 * 计算 HMAC-SHA256 原始字节，用于 Web Crypto 不可用时的兼容降级。
 */
export function hmacSha256(secret: string, value: string): Uint8Array {
  return hmac(sha256, utf8ToBytes(secret), utf8ToBytes(value));
}
