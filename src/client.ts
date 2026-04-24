import { postJson } from './fetch.js'
import type {
  ActionSource,
  AppData,
  FacebookCapiClientOptions,
  CapiResponse,
  ServerEvent,
  UserData,
} from './types.js'
import { buildUserData } from './user-data.js'

export interface SendOverrides {
  /** Override the client-level `testEventCode` for this request only. */
  testEventCode?: string
}

const DEFAULT_API_VERSION = 'v22.0'
const DEFAULT_TIMEOUT_MS = 10_000
const DEFAULT_RETRIES = 2

export class FacebookCapiClient {
  private accessToken: string
  private pixelId: string
  private actionSource: ActionSource
  private apiVersion: string
  private testEventCode: string | undefined
  private timeoutMs: number
  private retries: number
  private fetchImpl: typeof fetch
  private now: () => number
  private defaultUserData: UserData = {}

  constructor(options: FacebookCapiClientOptions) {
    if (!options.accessToken) throw new Error('FacebookCapiClient: accessToken is required')
    if (!options.pixelId) throw new Error('FacebookCapiClient: pixelId is required')

    this.accessToken = options.accessToken
    this.pixelId = options.pixelId
    this.actionSource = options.actionSource ?? 'website'
    this.apiVersion = options.apiVersion ?? DEFAULT_API_VERSION
    this.testEventCode = options.testEventCode
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    this.retries = options.retries ?? DEFAULT_RETRIES
    this.fetchImpl = options.fetch ?? fetch
    this.now = options.now ?? Date.now
  }

  /** Merge persistent user data that will be attached to every subsequent event. */
  setUserData(userData: UserData): void {
    this.defaultUserData = { ...this.defaultUserData, ...userData }
  }

  /** Replace (not merge) the persistent user data. */
  resetUserData(userData: UserData = {}): void {
    this.defaultUserData = userData
  }

  trackEvent(event: ServerEvent, overrides?: SendOverrides): Promise<CapiResponse> {
    return this.trackEvents([event], overrides)
  }

  async trackEvents(events: ServerEvent[], overrides?: SendOverrides): Promise<CapiResponse> {
    if (events.length === 0) throw new Error('FacebookCapiClient.trackEvents: no events provided')
    if (events.length > 1000) {
      throw new Error('FacebookCapiClient.trackEvents: Meta accepts at most 1000 events per request')
    }

    const url = `https://graph.facebook.com/${this.apiVersion}/${this.pixelId}/events`
    const nowSec = Math.floor(this.now() / 1000)

    const data = events.map((ev) => {
      const mergedUser: UserData = { ...this.defaultUserData, ...(ev.userData ?? {}) }
      return {
        event_name: ev.eventName,
        event_time: ev.eventTime ?? nowSec,
        ...(ev.eventId ? { event_id: ev.eventId } : {}),
        ...(ev.eventSourceUrl ? { event_source_url: ev.eventSourceUrl } : {}),
        ...(ev.referrerUrl ? { referrer_url: ev.referrerUrl } : {}),
        action_source: ev.actionSource ?? this.actionSource,
        user_data: buildUserData(mergedUser),
        ...(ev.customData ? { custom_data: ev.customData } : {}),
        ...(ev.appData ? { app_data: buildAppData(ev.appData) } : {}),
        ...(ev.optOut !== undefined ? { opt_out: ev.optOut } : {}),
        ...(ev.dataProcessingOptions
          ? { data_processing_options: ev.dataProcessingOptions }
          : {}),
        ...(ev.dataProcessingOptionsCountry !== undefined
          ? { data_processing_options_country: ev.dataProcessingOptionsCountry }
          : {}),
        ...(ev.dataProcessingOptionsState !== undefined
          ? { data_processing_options_state: ev.dataProcessingOptionsState }
          : {}),
      }
    })

    const body: Record<string, unknown> = {
      data,
      access_token: this.accessToken,
    }
    const testEventCode = overrides?.testEventCode ?? this.testEventCode
    if (testEventCode) body.test_event_code = testEventCode

    return postJson({
      url,
      body,
      timeoutMs: this.timeoutMs,
      retries: this.retries,
      fetchImpl: this.fetchImpl,
    })
  }
}

const APP_DATA_KEYS: Array<[keyof AppData, string]> = [
  ['advertiserTrackingEnabled', 'advertiser_tracking_enabled'],
  ['applicationTrackingEnabled', 'application_tracking_enabled'],
  ['extinfo', 'extinfo'],
  ['vendorId', 'vendor_id'],
  ['installReferrer', 'install_referrer'],
  ['campaignIds', 'campaign_ids'],
]

function buildAppData(app: AppData): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, wire] of APP_DATA_KEYS) {
    const raw = app[key]
    if (raw === undefined || raw === null || raw === '') continue
    out[wire] = typeof raw === 'boolean' ? (raw ? 1 : 0) : raw
  }
  for (const [k, v] of Object.entries(app)) {
    if (APP_DATA_KEYS.some(([known]) => known === k)) continue
    if (v === undefined || v === null || v === '') continue
    out[k] = v
  }
  return out
}
