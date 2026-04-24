import { afterEach, describe, expect, it, vi } from 'vitest'
import { FacebookCapiClient } from './client.js'
import { FacebookCapiError, FacebookCapiNetworkError } from './errors.js'
import { sha256 } from './hash.js'

const OK_BODY = { events_received: 1, messages: [], fbtrace_id: 'trace-1' }

function mockFetchOk(body: unknown = OK_BODY, status = 200): typeof fetch {
  return vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch
}

function mockFetchError(status: number, body: unknown): typeof fetch {
  return vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch
}

describe('FacebookCapiClient', () => {
  afterEach(() => vi.restoreAllMocks())

  it('requires accessToken and pixelId', () => {
    expect(() => new FacebookCapiClient({ accessToken: '', pixelId: 'p' })).toThrow(/accessToken/)
    expect(() => new FacebookCapiClient({ accessToken: 't', pixelId: '' })).toThrow(/pixelId/)
  })

  it('POSTs to graph.facebook.com with the configured api version and pixel id', async () => {
    const fetchImpl = mockFetchOk()
    const capi = new FacebookCapiClient({
      accessToken: 'tok',
      pixelId: '123',
      apiVersion: 'v21.0',
      fetch: fetchImpl,
      retries: 0,
      now: () => 1_700_000_000_000,
    })
    await capi.trackEvent({ eventName: 'Purchase' })

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('https://graph.facebook.com/v21.0/123/events')
    expect((init as RequestInit).method).toBe('POST')
  })

  it('builds a proper request body with hashed user data, event_time, and event_id', async () => {
    const fetchImpl = mockFetchOk()
    const capi = new FacebookCapiClient({
      accessToken: 'tok',
      pixelId: '123',
      fetch: fetchImpl,
      retries: 0,
      now: () => 1_700_000_000_000,
    })
    capi.setUserData({ emails: ['Foo@Bar.com'] })
    await capi.trackEvent({
      eventName: 'Purchase',
      eventId: 'order-1',
      eventSourceUrl: 'https://shop.example/thankyou',
      customData: { currency: 'USD', value: 99.99 },
    })

    const body = JSON.parse(
      (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string,
    )
    expect(body.access_token).toBe('tok')
    expect(body.data).toHaveLength(1)
    const ev = body.data[0]
    expect(ev.event_name).toBe('Purchase')
    expect(ev.event_time).toBe(1_700_000_000) // seconds
    expect(ev.event_id).toBe('order-1')
    expect(ev.action_source).toBe('website')
    expect(ev.event_source_url).toBe('https://shop.example/thankyou')
    expect(ev.user_data.em).toEqual([sha256('foo@bar.com')])
    expect(ev.custom_data).toEqual({ currency: 'USD', value: 99.99 })
  })

  it('merges per-call userData over default userData', async () => {
    const fetchImpl = mockFetchOk()
    const capi = new FacebookCapiClient({
      accessToken: 't',
      pixelId: 'p',
      fetch: fetchImpl,
      retries: 0,
    })
    capi.setUserData({ emails: ['default@example.com'], country: 'us' })
    await capi.trackEvent({
      eventName: 'Lead',
      userData: { emails: ['call@example.com'] }, // overrides emails, keeps country
    })

    const body = JSON.parse(
      (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string,
    )
    expect(body.data[0].user_data.em).toEqual([sha256('call@example.com')])
    expect(body.data[0].user_data.country).toBe(sha256('us'))
  })

  it('includes test_event_code when configured', async () => {
    const fetchImpl = mockFetchOk()
    const capi = new FacebookCapiClient({
      accessToken: 't',
      pixelId: 'p',
      testEventCode: 'TEST123',
      fetch: fetchImpl,
      retries: 0,
    })
    await capi.trackEvent({ eventName: 'PageView' })

    const body = JSON.parse(
      (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string,
    )
    expect(body.test_event_code).toBe('TEST123')
  })

  it('sends a batch when trackEvents is called', async () => {
    const fetchImpl = mockFetchOk({ ...OK_BODY, events_received: 3 })
    const capi = new FacebookCapiClient({
      accessToken: 't',
      pixelId: 'p',
      fetch: fetchImpl,
      retries: 0,
    })
    const res = await capi.trackEvents([
      { eventName: 'PageView' },
      { eventName: 'ViewContent' },
      { eventName: 'AddToCart' },
    ])

    const body = JSON.parse(
      (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string,
    )
    expect(body.data).toHaveLength(3)
    expect(res.events_received).toBe(3)
  })

  it('rejects when asked to send 0 events or more than 1000', async () => {
    const capi = new FacebookCapiClient({ accessToken: 't', pixelId: 'p', fetch: mockFetchOk() })
    await expect(capi.trackEvents([])).rejects.toThrow(/no events/)
    const too_many = Array.from({ length: 1001 }, () => ({ eventName: 'PageView' as const }))
    await expect(capi.trackEvents(too_many)).rejects.toThrow(/1000/)
  })

  it('throws FacebookCapiError on 4xx with the Meta error message', async () => {
    const errBody = {
      error: {
        message: 'Invalid access token',
        type: 'OAuthException',
        code: 190,
        fbtrace_id: 'trace-bad',
      },
    }
    const fetchImpl = mockFetchError(400, errBody)
    const capi = new FacebookCapiClient({
      accessToken: 't',
      pixelId: 'p',
      fetch: fetchImpl,
      retries: 2,
    })
    const err = await capi.trackEvent({ eventName: 'PageView' }).catch((e: unknown) => e)

    expect(err).toBeInstanceOf(FacebookCapiError)
    expect((err as FacebookCapiError).status).toBe(400)
    expect((err as FacebookCapiError).message).toBe('Invalid access token')
    expect((err as FacebookCapiError).fbtraceId).toBe('trace-bad')
    expect(fetchImpl).toHaveBeenCalledTimes(1) // 4xx is not retried
  })

  it('retries on 5xx and eventually succeeds', async () => {
    let call = 0
    const fetchImpl = vi.fn(async () => {
      call++
      if (call < 3) return new Response('{}', { status: 503 })
      return new Response(JSON.stringify(OK_BODY), { status: 200 })
    }) as unknown as typeof fetch

    const capi = new FacebookCapiClient({
      accessToken: 't',
      pixelId: 'p',
      fetch: fetchImpl,
      retries: 3,
    })
    const res = await capi.trackEvent({ eventName: 'PageView' })
    expect(res.events_received).toBe(1)
    expect(fetchImpl).toHaveBeenCalledTimes(3)
  })

  it('serializes referrer_url and app_data on the wire', async () => {
    const fetchImpl = mockFetchOk()
    const capi = new FacebookCapiClient({
      accessToken: 't',
      pixelId: 'p',
      fetch: fetchImpl,
      retries: 0,
    })
    await capi.trackEvent({
      eventName: 'Purchase',
      referrerUrl: 'https://ref.test/',
      actionSource: 'app',
      appData: {
        advertiserTrackingEnabled: true,
        applicationTrackingEnabled: 0,
        extinfo: ['i2', 'com.example'],
        vendorId: 'vid-1',
      },
    })
    const body = JSON.parse(
      (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string,
    )
    expect(body.data[0].referrer_url).toBe('https://ref.test/')
    expect(body.data[0].app_data.advertiser_tracking_enabled).toBe(1) // boolean coerced
    expect(body.data[0].app_data.application_tracking_enabled).toBe(0)
    expect(body.data[0].app_data.extinfo).toEqual(['i2', 'com.example'])
    expect(body.data[0].app_data.vendor_id).toBe('vid-1')
  })

  it('defaults to Graph API v22.0', async () => {
    const fetchImpl = mockFetchOk()
    const capi = new FacebookCapiClient({ accessToken: 't', pixelId: '9', fetch: fetchImpl, retries: 0 })
    await capi.trackEvent({ eventName: 'PageView' })
    const [url] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('https://graph.facebook.com/v22.0/9/events')
  })

  it('throws FacebookCapiNetworkError when fetch itself rejects past retry budget', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('ECONNRESET')
    }) as unknown as typeof fetch
    const capi = new FacebookCapiClient({
      accessToken: 't',
      pixelId: 'p',
      fetch: fetchImpl,
      retries: 1,
    })
    await expect(capi.trackEvent({ eventName: 'PageView' })).rejects.toBeInstanceOf(FacebookCapiNetworkError)
    expect(fetchImpl).toHaveBeenCalledTimes(2) // initial + 1 retry
  })
})
