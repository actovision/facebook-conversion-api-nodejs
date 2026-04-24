import { maybeHash } from './hash.js'
import {
  normalizeCity,
  normalizeCountry,
  normalizeDob,
  normalizeEmail,
  normalizeExternalId,
  normalizeGender,
  normalizeName,
  normalizePhone,
  normalizeState,
  normalizeZip,
} from './normalize.js'
import type { UserData } from './types.js'

type Normalizer = (v: string) => string

interface HashedFieldSpec {
  key: keyof UserData
  /** Meta's wire key (e.g. 'em', 'ph'). */
  wire: string
  /** True = always an array on the wire. */
  array: boolean
  normalize: Normalizer
}

const HASHED_FIELDS: HashedFieldSpec[] = [
  { key: 'emails', wire: 'em', array: true, normalize: normalizeEmail },
  { key: 'phones', wire: 'ph', array: true, normalize: normalizePhone },
  { key: 'firstName', wire: 'fn', array: false, normalize: normalizeName },
  { key: 'lastName', wire: 'ln', array: false, normalize: normalizeName },
  { key: 'gender', wire: 'ge', array: false, normalize: normalizeGender },
  { key: 'dateOfBirth', wire: 'db', array: false, normalize: normalizeDob },
  { key: 'city', wire: 'ct', array: false, normalize: normalizeCity },
  { key: 'state', wire: 'st', array: false, normalize: normalizeState },
  { key: 'zip', wire: 'zp', array: false, normalize: normalizeZip },
  { key: 'country', wire: 'country', array: false, normalize: normalizeCountry },
  { key: 'externalId', wire: 'external_id', array: true, normalize: normalizeExternalId },
]

/** Fields sent unhashed (Meta does the matching on its side). */
const PASSTHROUGH: Array<[keyof UserData, string]> = [
  ['clientIpAddress', 'client_ip_address'],
  ['clientUserAgent', 'client_user_agent'],
  ['fbc', 'fbc'],
  ['fbp', 'fbp'],
  ['facebookLoginId', 'fb_login_id'],
  ['subscriptionId', 'subscription_id'],
  ['leadId', 'lead_id'],
  ['madid', 'madid'],
  ['anonId', 'anon_id'],
  ['pageId', 'page_id'],
  ['pageScopedUserId', 'page_scoped_user_id'],
  ['ctwaClid', 'ctwa_clid'],
  ['igAccountId', 'ig_account_id'],
  ['igSid', 'ig_sid'],
]

/** Produce the `user_data` object in Meta's wire shape. */
export function buildUserData(userData: UserData | undefined): Record<string, unknown> {
  if (!userData) return {}
  const out: Record<string, unknown> = {}

  for (const spec of HASHED_FIELDS) {
    const raw = userData[spec.key]
    if (raw === undefined || raw === null || raw === '') continue

    if (spec.array) {
      const arr = Array.isArray(raw) ? raw : [raw]
      const hashed = arr
        .map((v) => (v == null ? '' : String(v)))
        .map((v) => spec.normalize(v))
        .filter((v) => v.length > 0)
        .map((v) => maybeHash(v))
      if (hashed.length > 0) out[spec.wire] = hashed
    } else {
      const normalized = spec.normalize(String(raw))
      if (normalized.length > 0) out[spec.wire] = maybeHash(normalized)
    }
  }

  for (const [key, wire] of PASSTHROUGH) {
    const v = userData[key]
    if (v !== undefined && v !== null && v !== '') out[wire] = v
  }

  return out
}
