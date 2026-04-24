# @actovision/facebook-conversion-api-nodejs

Node.js / TypeScript client for [Meta's Conversions API](https://developers.facebook.com/docs/marketing-api/conversions-api/). Direct Graph API calls — **zero runtime dependencies**.

- Full CAPI parameter coverage: every standard event, every `user_data` signal (`em`, `ph`, `fn`, `ln`, `ge`, `db`, `ct`, `st`, `zp`, `country`, `external_id`, `client_ip_address`, `client_user_agent`, `fbp`, `fbc`, `fb_login_id`, `subscription_id`, `lead_id`, `madid`, `anon_id`, `page_id`, `page_scoped_user_id`, `ctwa_clid`, `ig_account_id`, `ig_sid`), `app_data` for app-source events, `referrer_url`, LDU/CCPA, test events, deduplication via `event_id`
- Automatic SHA-256 hashing + Meta's normalization rules (idempotent)
- Batching up to 1,000 events per request, retry on 5xx with exponential backoff
- Defaults to Graph API **v22.0** — configurable via `apiVersion`

## Install

```bash
npm install @actovision/facebook-conversion-api-nodejs
# or
pnpm add @actovision/facebook-conversion-api-nodejs
```

Requires Node.js ≥ 22 (uses global `fetch` and `node:crypto`).

## Quick start

```ts
import { FacebookCapiClient } from '@actovision/facebook-conversion-api-nodejs'

const capi = new FacebookCapiClient({
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

### `new FacebookCapiClient(options)`

| Option | Type | Default |
| --- | --- | --- |
| `accessToken` | `string` | **required** |
| `pixelId` | `string` | **required** |
| `actionSource` | `ActionSource` | `'website'` |
| `apiVersion` | `string` | `'v22.0'` |
| `testEventCode` | `string` | — |
| `timeoutMs` | `number` | `10_000` |
| `retries` | `number` | `2` (retries only on 5xx / network errors) |
| `fetch` | `typeof fetch` | global `fetch` — override for tests |

### Methods

- `setUserData(userData)` — merge persistent user data used on every subsequent event.
- `resetUserData(userData?)` — replace persistent user data.
- `trackEvent(event)` — send one event. Returns `Promise<FacebookCapiResponse>`.
- `trackEvents(events)` — send up to 1000 events in one request.

### Automatic hashing & normalization

The following fields are normalized (per [Meta's rules](https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters)) and SHA-256 hashed before transmission:

`emails`, `phones`, `firstName`, `lastName`, `gender`, `dateOfBirth`, `city`, `state`, `zip`, `country`, `externalId`

Network signals that must **not** be hashed are passed through unchanged: `clientIpAddress`, `clientUserAgent`, `fbp`, `fbc`, `facebookLoginId`, `subscriptionId`, `leadId`, `madid`, `anonId`, `pageId`, `pageScopedUserId`, `ctwaClid`, `igAccountId`, `igSid`.

Hashing is idempotent — if you pass a value that already looks like a SHA-256 hex digest, it is forwarded as-is.

## Standard events

Every Meta standard event is supported. Attach persistent customer data once via `setUserData()`, then call `trackEvent()` per-action. Event names are case-sensitive — use the names exactly as shown.

```ts
import { FacebookCapiClient } from '@actovision/facebook-conversion-api-nodejs'

const capi = new FacebookCapiClient({
  accessToken: process.env.FB_ACCESS_TOKEN!,
  pixelId: process.env.FB_PIXEL_ID!,
  actionSource: 'website',
})

// Attach network signals and identity that are stable per-session.
capi.setUserData({
  emails: ['customer@example.com'],
  phones: ['+1 555 123 4567'],
  clientIpAddress: '203.0.113.42',
  clientUserAgent: 'Mozilla/5.0 ...',
  fbp: 'fb.1.1554763741205.12345',
  fbc: 'fb.1.1554763741205.AbCdEf',
})

// Purchase — completed transaction
await capi.trackEvent({
  eventName: 'Purchase',
  eventId: 'ORDER-12345',
  eventSourceUrl: 'https://shop.example.com/thankyou',
  customData: {
    value: 99.99,
    currency: 'USD',
    order_id: 'ORDER-12345',
    contents: [{ id: 'sku-1', quantity: 1, item_price: 99.99 }],
    content_ids: ['sku-1'],
    content_type: 'product',
  },
})

// AddToCart
await capi.trackEvent({
  eventName: 'AddToCart',
  eventId: 'evt-addtocart-1',
  customData: {
    content_ids: ['sku-1'],
    contents: [{ id: 'sku-1', quantity: 1, item_price: 49.99 }],
    content_type: 'product',
    value: 49.99,
    currency: 'USD',
  },
})

// InitiateCheckout
await capi.trackEvent({
  eventName: 'InitiateCheckout',
  eventId: 'evt-checkout-1',
  customData: {
    content_ids: ['sku-1', 'sku-2'],
    num_items: 2,
    value: 79.98,
    currency: 'USD',
  },
})

// AddPaymentInfo
await capi.trackEvent({
  eventName: 'AddPaymentInfo',
  eventId: 'evt-payinfo-1',
  customData: { value: 79.98, currency: 'USD' },
})

// ViewContent
await capi.trackEvent({
  eventName: 'ViewContent',
  eventId: 'evt-view-1',
  customData: {
    content_ids: ['sku-1'],
    content_name: 'Running Shoes',
    content_category: 'Footwear',
    content_type: 'product',
    value: 49.99,
    currency: 'USD',
  },
})

// Search
await capi.trackEvent({
  eventName: 'Search',
  eventId: 'evt-search-1',
  customData: {
    search_string: 'running shoes',
    content_ids: ['sku-1', 'sku-2'],
    content_category: 'Footwear',
  },
})

// Lead
await capi.trackEvent({
  eventName: 'Lead',
  eventId: 'evt-lead-1',
  customData: { content_name: 'Newsletter Signup', value: 0, currency: 'USD' },
})

// CompleteRegistration
await capi.trackEvent({
  eventName: 'CompleteRegistration',
  eventId: 'evt-signup-1',
  customData: {
    content_name: 'Free Plan',
    status: 'completed',
    value: 0,
    currency: 'USD',
  },
})

// Subscribe
await capi.trackEvent({
  eventName: 'Subscribe',
  eventId: 'evt-sub-1',
  customData: { value: 9.99, currency: 'USD', predicted_ltv: 120 },
})

// StartTrial
await capi.trackEvent({
  eventName: 'StartTrial',
  eventId: 'evt-trial-1',
  customData: { value: 0, currency: 'USD', predicted_ltv: 120 },
})

// AddToWishlist
await capi.trackEvent({
  eventName: 'AddToWishlist',
  eventId: 'evt-wish-1',
  customData: { content_ids: ['sku-1'], value: 49.99, currency: 'USD' },
})

// FindLocation
await capi.trackEvent({
  eventName: 'FindLocation',
  eventId: 'evt-find-1',
  customData: { content_name: 'Downtown Store' },
})

// Schedule
await capi.trackEvent({
  eventName: 'Schedule',
  eventId: 'evt-sched-1',
  customData: { content_name: 'Consultation' },
})

// SubmitApplication
await capi.trackEvent({
  eventName: 'SubmitApplication',
  eventId: 'evt-app-1',
  customData: { value: 0, currency: 'USD' },
})

// Donate
await capi.trackEvent({
  eventName: 'Donate',
  eventId: 'evt-donate-1',
  customData: { value: 25, currency: 'USD' },
})

// Contact
await capi.trackEvent({
  eventName: 'Contact',
  eventId: 'evt-contact-1',
})

// PageView
await capi.trackEvent({
  eventName: 'PageView',
  eventId: 'evt-pv-1',
  eventSourceUrl: 'https://shop.example.com/',
})
```

Need a custom event? Pass any string for `eventName` — typed as `EventName = StandardEventName | (string & {})`.

## App events

For app-source events, set `actionSource: 'app'` and pass `appData`:

```ts
await capi.trackEvent({
  eventName: 'Purchase',
  eventId: 'order-1',
  actionSource: 'app',
  userData: { madid: '<IDFA or GAID>', emails: ['buyer@example.com'] },
  customData: { currency: 'USD', value: 9.99 },
  appData: {
    advertiserTrackingEnabled: 1,           // iOS ATT consent (boolean coerced to 0/1)
    applicationTrackingEnabled: 1,
    extinfo: ['i2', 'com.example.app', '1.0', '1', '17.0', 'iPhone15,2', 'en_US', 'PST', 'Verizon', 390, 844, 3, 6, 8, 128],
    vendorId: 'IDFV-...',
  },
})
```

## Offline conversions

For offline events (in-store purchases, phone sales, chat closures), set `actionSource` accordingly (`physical_store`, `phone_call`, `email`, `chat`, `other`). Meta accepts offline events up to **62 days** after the conversion.

## Deduplication with the browser pixel

Pass the same `eventId` that your browser pixel uses as the third `fbq('track', ..., { eventID })` argument. Meta will collapse the two deliveries into one event. See [`@actovision/facebook-conversion-api-nextjs`](https://github.com/actovision/actovision-facebook-conversion-api-nextjs) for a turnkey Next.js setup.

## Errors

- `FacebookCapiError` — thrown on 4xx / non-retryable 5xx. Exposes `.status`, `.body`, `.fbtraceId`.
- `FacebookCapiNetworkError` — thrown when fetch itself fails (timeout, DNS, connection reset) after the retry budget.

## Singleton usage

For simple apps with a single pixel, a process-wide singleton is exported:

```ts
import { facebookConversionAPI } from '@actovision/facebook-conversion-api-nodejs'

facebookConversionAPI.init({ accessToken, pixelId, actionSource: 'website' })
facebookConversionAPI.setUserData({ emails: ['a@b.com'] })
await facebookConversionAPI.trackEvent({ eventName: 'PageView' })
```

Prefer `new FacebookCapiClient(...)` if you need multiple pixels, want dependency injection, or care about test isolation.

## License

[MIT](./LICENSE) © 2026 [Actovision](https://github.com/actovision).

Free to use in commercial and open-source projects. The license text must be included in copies or substantial portions of the software.
