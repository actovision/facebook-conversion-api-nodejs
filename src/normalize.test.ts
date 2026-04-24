import { describe, expect, it } from 'vitest'
import {
  normalizeCity,
  normalizeCountry,
  normalizeDob,
  normalizeEmail,
  normalizeGender,
  normalizeName,
  normalizePhone,
  normalizeState,
  normalizeZip,
} from './normalize.js'

describe('normalize', () => {
  it('lowercases and trims emails', () => {
    expect(normalizeEmail('  Foo@Bar.COM ')).toBe('foo@bar.com')
  })

  it('strips non-digits from phones', () => {
    expect(normalizePhone('+1 (555) 123-4567')).toBe('15551234567')
  })

  it('lowercases names', () => {
    expect(normalizeName('  John  ')).toBe('john')
  })

  it('takes first lowercase char of gender', () => {
    expect(normalizeGender('Male')).toBe('m')
    expect(normalizeGender('F')).toBe('f')
  })

  it('strips non-digits from dob', () => {
    expect(normalizeDob('1997-02-16')).toBe('19970216')
  })

  it('removes whitespace from city', () => {
    expect(normalizeCity(' São Paulo ')).toBe('sãopaulo')
  })

  it('keeps only lowercase letters in state', () => {
    expect(normalizeState(' SP ')).toBe('sp')
    expect(normalizeState('CA-12')).toBe('ca')
  })

  it('removes whitespace and dashes from zip', () => {
    expect(normalizeZip(' 90210-1234 ')).toBe('902101234')
  })

  it('lowercases + truncates country to alpha-2', () => {
    expect(normalizeCountry('USA')).toBe('us')
    expect(normalizeCountry('in')).toBe('in')
  })
})
