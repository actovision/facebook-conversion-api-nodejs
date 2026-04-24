import { createHash } from 'node:crypto'

/** 64-hex-char lowercase SHA-256. Meta matches on this exact shape. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

const SHA256_RE = /^[a-f0-9]{64}$/

/** Idempotent: if `value` is already a SHA-256 hex digest, return it as-is. */
export function maybeHash(value: string): string {
  return SHA256_RE.test(value) ? value : sha256(value)
}
