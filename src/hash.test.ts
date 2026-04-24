import { describe, expect, it } from 'vitest'
import { maybeHash, sha256 } from './hash.js'

describe('sha256', () => {
  it('produces the canonical 64-char lowercase hex digest', () => {
    // Known test vector
    expect(sha256('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    )
    expect(sha256('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })
})

describe('maybeHash', () => {
  it('hashes plain strings', () => {
    expect(maybeHash('user@example.com')).toBe(sha256('user@example.com'))
  })

  it('returns already-hashed values untouched (idempotent)', () => {
    const already = sha256('user@example.com')
    expect(maybeHash(already)).toBe(already)
  })

  it('does NOT treat 64-char non-hex as a hash', () => {
    const notHash = 'z'.repeat(64)
    expect(maybeHash(notHash)).toBe(sha256(notHash))
  })
})
