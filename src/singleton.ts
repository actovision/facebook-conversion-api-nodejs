import { CapiClient } from './client.js'
import type { CapiClientOptions, CapiResponse, ServerEvent, UserData } from './types.js'

/**
 * Process-wide singleton offering the shorthand `init()` / `setUserData()` /
 * `trackEvent()` ergonomics. Prefer `new CapiClient(...)` in new code — it
 * supports multiple pixels per process.
 */
class FacebookConversionAPISingleton {
  private client: CapiClient | undefined
  private pendingUserData: UserData = {}

  init(options: CapiClientOptions): void {
    this.client = new CapiClient(options)
    if (Object.keys(this.pendingUserData).length > 0) {
      this.client.setUserData(this.pendingUserData)
      this.pendingUserData = {}
    }
  }

  setUserData(userData: UserData): void {
    if (this.client) this.client.setUserData(userData)
    else this.pendingUserData = { ...this.pendingUserData, ...userData }
  }

  trackEvent(event: ServerEvent): Promise<CapiResponse> {
    this.requireClient()
    return this.client!.trackEvent(event)
  }

  trackEvents(events: ServerEvent[]): Promise<CapiResponse> {
    this.requireClient()
    return this.client!.trackEvents(events)
  }

  private requireClient(): void {
    if (!this.client) {
      throw new Error(
        'facebookConversionAPI.init() must be called before tracking events',
      )
    }
  }
}

export const facebookConversionAPI = new FacebookConversionAPISingleton()
