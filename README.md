# @actovision/facebook-conversion-api-nodejs

Node.js / TypeScript client for [Meta's Conversions API](https://developers.facebook.com/docs/marketing-api/conversions-api/). Direct Graph API calls — **zero runtime dependencies**.

## Install

```bash
npm install @actovision/facebook-conversion-api-nodejs
# or
pnpm add @actovision/facebook-conversion-api-nodejs
```

Requires Node.js ≥ 22 (uses global `fetch` and `node:crypto`).

## Quick start

```ts
import { CapiClient } from '@actovision/facebook-conversion-api-nodejs'

const capi = new CapiClient({
  accessToken: process.env.FB_ACCESS_TOKEN!,
  pixelId: process.env.FB_PIXEL_ID!,
  actionSource: 'website',
})

await capi.trackEvent({
  eventName: 'Purchase',
  eventId: 'order-12345', // use for browser-pixel deduplication
  eventSourceUrl: 'https://shop.example.com/thankyou',
  userData: {
    emails: ['customer@example.com'],
    phones: ['+1 555 123 4567'],
    clientIpAddress: '203.0.113.42',
    clientUserAgent: 'Mozilla/5.0 ...',
    fbp: 'fb.1.1554763741205.12345',
    fbc: 'fb.1.1554763741205.AbCdEf',
  },
  customData: {
    currency: 'USD',
    value: 99.99,
    contents: [{ id: 'sku-1', quantity: 1, item_price: 99.99 }],
  },
})
```

## API

### `new CapiClient(options)`

| Option | Type | Default |
| --- | --- | --- |
| `accessToken` | `string` | **required** |
| `pixelId` | `string` | **required** |
| `actionSource` | `ActionSource` | `'website'` |
| `apiVersion` | `string` | `'v21.0'` |
| `testEventCode` | `string` | — |
| `timeoutMs` | `number` | `10_000` |
| `retries` | `number` | `2` (retries only on 5xx / network errors) |
| `fetch` | `typeof fetch` | global `fetch` — override for tests |

### Methods

- `setUserData(userData)` — merge persistent user data used on every subsequent event.
- `resetUserData(userData?)` — replace persistent user data.
- `trackEvent(event)` — send one event. Returns `Promise<CapiResponse>`.
- `trackEvents(events)` — send up to 1000 events in one request.

### Automatic hashing & normalization

The following fields are normalized (per [Meta's rules](https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters)) and SHA-256 hashed before transmission:

`emails`, `phones`, `firstName`, `lastName`, `gender`, `dateOfBirth`, `city`, `state`, `zip`, `country`, `externalId`

Network signals that must **not** be hashed are passed through unchanged: `clientIpAddress`, `clientUserAgent`, `fbp`, `fbc`, `facebookLoginId`, `subscriptionId`, `leadId`.

Hashing is idempotent — if you pass a value that already looks like a SHA-256 hex digest, it is forwarded as-is.

## Deduplication with the browser pixel

Pass the same `eventId` that your browser pixel uses as the third `fbq('track', ..., { eventID })` argument. Meta will collapse the two deliveries into one event. See [`@actovision/facebook-conversion-api-nextjs`](https://github.com/actovision/actovision-facebook-conversion-api-nextjs) for a turnkey Next.js setup.

## Errors

- `CapiError` — thrown on 4xx / non-retryable 5xx. Exposes `.status`, `.body`, `.fbtraceId`.
- `CapiNetworkError` — thrown when fetch itself fails (timeout, DNS, connection reset) after the retry budget.

## Singleton usage

For simple apps with a single pixel, a process-wide singleton is exported:

```ts
import { facebookConversionAPI } from '@actovision/facebook-conversion-api-nodejs'

facebookConversionAPI.init({ accessToken, pixelId, actionSource: 'website' })
facebookConversionAPI.setUserData({ emails: ['a@b.com'] })
await facebookConversionAPI.trackEvent({ eventName: 'PageView' })
```

Prefer `new CapiClient(...)` if you need multiple pixels, want dependency injection, or care about test isolation.

## License

MIT
