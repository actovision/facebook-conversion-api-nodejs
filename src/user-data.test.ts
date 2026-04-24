import { describe, expect, it } from 'vitest'
import { sha256 } from './hash.js'
import { buildUserData } from './user-data.js'

describe('buildUserData', () => {
  it('returns an empty object for undefined input', () => {
    expect(buildUserData(undefined)).toEqual({})
  })

  it('hashes email after lowercasing + trimming', () => {
    const out = buildUserData({ emails: ['  Foo@Bar.COM '] })
    expect(out.em).toEqual([sha256('foo@bar.com')])
  })

  it('hashes multiple phones with digits-only normalization', () => {
    const out = buildUserData({ phones: ['+1 (555) 123-4567', '555.987.6543'] })
    expect(out.ph).toEqual([sha256('15551234567'), sha256('5559876543')])
  })

  it('hashes scalar fields (first name, last name, gender, dob)', () => {
    const out = buildUserData({
      firstName: 'John',
      lastName: 'Doe',
      gender: 'm',
      dateOfBirth: '1997-02-16',
    })
    expect(out.fn).toBe(sha256('john'))
    expect(out.ln).toBe(sha256('doe'))
    expect(out.ge).toBe(sha256('m'))
    expect(out.db).toBe(sha256('19970216'))
  })

  it('hashes location fields with correct wire keys', () => {
    const out = buildUserData({
      city: 'San Francisco',
      state: 'CA',
      zip: '94107',
      country: 'US',
    })
    expect(out.ct).toBe(sha256('sanfrancisco'))
    expect(out.st).toBe(sha256('ca'))
    expect(out.zp).toBe(sha256('94107'))
    expect(out.country).toBe(sha256('us'))
  })

  it('treats externalId as an array on the wire', () => {
    expect(buildUserData({ externalId: 'abc' }).external_id).toEqual([sha256('abc')])
    expect(buildUserData({ externalId: ['abc', 'xyz'] }).external_id).toEqual([
      sha256('abc'),
      sha256('xyz'),
    ])
  })

  it('passes through network signals without hashing', () => {
    const out = buildUserData({
      clientIpAddress: '1.2.3.4',
      clientUserAgent: 'Mozilla/5.0',
      fbp: 'fb.1.123.456',
      fbc: 'fb.1.abc.def',
      facebookLoginId: '1234567890',
      subscriptionId: 'sub_1',
      leadId: 42,
    })
    expect(out.client_ip_address).toBe('1.2.3.4')
    expect(out.client_user_agent).toBe('Mozilla/5.0')
    expect(out.fbp).toBe('fb.1.123.456')
    expect(out.fbc).toBe('fb.1.abc.def')
    expect(out.fb_login_id).toBe('1234567890')
    expect(out.subscription_id).toBe('sub_1')
    expect(out.lead_id).toBe(42)
  })

  it('ignores empty / null / undefined values silently', () => {
    const out = buildUserData({
      emails: ['', '  '],
      firstName: '',
      lastName: undefined,
      city: '',
    })
    expect(out).toEqual({})
  })

  it('does not re-hash an already-hashed value', () => {
    const alreadyHashed = sha256('user@example.com')
    const out = buildUserData({ emails: [alreadyHashed] })
    expect(out.em).toEqual([alreadyHashed])
  })

  it('passes through messaging / app identity signals unhashed', () => {
    const out = buildUserData({
      madid: 'idfa-1',
      anonId: 'anon-1',
      pageId: 'page-1',
      pageScopedUserId: 'psid-1',
      ctwaClid: 'ctwa-1',
      igAccountId: 'ig-1',
      igSid: 'igsid-1',
    })
    expect(out.madid).toBe('idfa-1')
    expect(out.anon_id).toBe('anon-1')
    expect(out.page_id).toBe('page-1')
    expect(out.page_scoped_user_id).toBe('psid-1')
    expect(out.ctwa_clid).toBe('ctwa-1')
    expect(out.ig_account_id).toBe('ig-1')
    expect(out.ig_sid).toBe('igsid-1')
  })
})
