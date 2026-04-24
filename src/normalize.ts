/**
 * Meta's user-data normalization rules.
 * Docs: https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters
 * All inputs are normalized before being hashed.
 */

const trimLower = (v: string) => v.trim().toLowerCase()

export const normalizeEmail = trimLower

/** Strip everything except digits. Meta does not require a country code prefix, but accepts it. */
export const normalizePhone = (v: string) => v.replace(/\D/g, '')

export const normalizeName = trimLower

/** 'm' | 'f' — single lowercase char. */
export const normalizeGender = (v: string) => v.trim().charAt(0).toLowerCase()

/** YYYYMMDD, digits only. */
export const normalizeDob = (v: string) => v.replace(/\D/g, '')

export const normalizeCity = (v: string) => v.trim().toLowerCase().replace(/\s+/g, '')

/** 2-char lowercase state/region code. */
export const normalizeState = (v: string) => v.trim().toLowerCase().replace(/[^a-z]/g, '')

/** Zip with whitespace and dashes removed. */
export const normalizeZip = (v: string) => v.trim().toLowerCase().replace(/[\s-]/g, '')

/** ISO 3166-1 alpha-2 lowercase. */
export const normalizeCountry = (v: string) => v.trim().toLowerCase().slice(0, 2)

export const normalizeExternalId = (v: string) => v.trim()
