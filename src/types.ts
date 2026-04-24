/**
 * Meta Conversions API types.
 * Docs: https://developers.facebook.com/docs/marketing-api/conversions-api/parameters
 */

export type ActionSource =
  | 'email'
  | 'website'
  | 'app'
  | 'phone_call'
  | 'physical_store'
  | 'system_generated'
  | 'business_messaging'
  | 'chat'
  | 'other'

export type StandardEventName =
  | 'AddPaymentInfo'
  | 'AddToCart'
  | 'AddToWishlist'
  | 'CompleteRegistration'
  | 'Contact'
  | 'CustomizeProduct'
  | 'Donate'
  | 'FindLocation'
  | 'InitiateCheckout'
  | 'Lead'
  | 'PageView'
  | 'Purchase'
  | 'Schedule'
  | 'Search'
  | 'StartTrial'
  | 'SubmitApplication'
  | 'Subscribe'
  | 'ViewContent'

/** Allow the standard union while still accepting arbitrary custom event names. */
export type EventName = StandardEventName | (string & {})

/**
 * User data parameters.
 * Fields listed in the Meta docs as requiring hashing will be hashed automatically
 * before being sent. Fields like `clientIpAddress`, `clientUserAgent`, `fbp`,
 * `fbc` must NOT be hashed.
 */
export interface UserData {
  emails?: string[]
  phones?: string[]
  firstName?: string
  lastName?: string
  gender?: 'm' | 'f'
  /** YYYYMMDD */
  dateOfBirth?: string
  city?: string
  state?: string
  zip?: string
  /** ISO 3166-1 alpha-2 lowercase e.g. "us", "in" */
  country?: string
  externalId?: string | string[]
  clientIpAddress?: string
  clientUserAgent?: string
  fbc?: string
  fbp?: string
  facebookLoginId?: string
  subscriptionId?: string
  leadId?: string | number
  /** Mobile Advertiser ID — IDFA (iOS) or GAID (Android). App events. */
  madid?: string
  /** Anonymous install ID when MADID unavailable. App events. */
  anonId?: string
  /** Facebook Page ID — messaging events. */
  pageId?: string
  /** Messenger Page-Scoped User ID — messaging events. */
  pageScopedUserId?: string
  /** Click-to-WhatsApp click ID. */
  ctwaClid?: string
  /** Instagram Account ID — Instagram messaging/lead events. */
  igAccountId?: string
  /** Click-to-Instagram session ID. */
  igSid?: string
}

export interface Content {
  id: string
  quantity?: number
  item_price?: number
  delivery_category?: 'in_store' | 'curbside' | 'home_delivery'
  title?: string
  description?: string
  brand?: string
  category?: string
  [key: string]: unknown
}

export interface CustomData {
  currency?: string
  value?: number
  content_name?: string
  content_category?: string
  content_ids?: Array<string | number>
  content_type?: 'product' | 'product_group'
  contents?: Content[]
  num_items?: number
  predicted_ltv?: number
  order_id?: string
  search_string?: string
  status?: string
  /** Top-level delivery category for Purchase events. */
  delivery_category?: 'in_store' | 'curbside' | 'home_delivery'
  [key: string]: unknown
}

/**
 * `app_data` parameters sent when `action_source` is `app`.
 * Docs: https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/app-and-web-data
 */
export interface AppData {
  /** iOS ATT consent. `1` = granted, `0` = denied. */
  advertiserTrackingEnabled?: 0 | 1 | boolean
  /** App-level tracking toggle. `1` = enabled. */
  applicationTrackingEnabled?: 0 | 1 | boolean
  /** Extended device info: [version, appPkgName, shortVersion, longVersion, osVersion, deviceModel, locale, tzAbbr, carrier, screenWidth, screenHeight, screenDensity, cpuCores, storageGB, ramGB]. */
  extinfo?: unknown[]
  /** iOS Vendor ID (IDFV). */
  vendorId?: string
  /** Google Play install referrer string. */
  installReferrer?: string
  /** Attribution campaign IDs (JSON string). */
  campaignIds?: string
  /** Allow arbitrary extra app_data fields. */
  [key: string]: unknown
}

export interface ServerEvent {
  eventName: EventName
  /** Unix seconds. Defaults to now. */
  eventTime?: number
  /** For pixel/server deduplication. */
  eventId?: string
  eventSourceUrl?: string
  /** URL of the referring page. Optional but improves attribution. */
  referrerUrl?: string
  actionSource?: ActionSource
  userData?: UserData
  customData?: CustomData
  /** Required for `actionSource: 'app'`. */
  appData?: AppData
  optOut?: boolean
  dataProcessingOptions?: string[]
  dataProcessingOptionsCountry?: number
  dataProcessingOptionsState?: number
}

export interface FacebookCapiClientOptions {
  accessToken: string
  pixelId: string
  /** Default action_source applied to every event unless overridden. */
  actionSource?: ActionSource
  /** Graph API version. Defaults to 'v22.0'. */
  apiVersion?: string
  /** Meta Events Manager test code for Test Events tab. */
  testEventCode?: string
  /** Request timeout in ms. Default 10_000. */
  timeoutMs?: number
  /** Retry count on network / 5xx errors. Default 2. */
  retries?: number
  /** Override fetch (for tests). */
  fetch?: typeof fetch
  /** Override Date.now (for tests). */
  now?: () => number
}

export interface CapiResponse {
  events_received: number
  messages: string[]
  fbtrace_id: string
}

export interface CapiErrorBody {
  error: {
    message: string
    type: string
    code: number
    error_subcode?: number
    error_user_msg?: string
    fbtrace_id: string
  }
}
