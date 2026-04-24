import type { FacebookCapiErrorBody } from './types.js'

export class FacebookCapiError extends Error {
  readonly status: number
  readonly body: FacebookCapiErrorBody | undefined
  readonly fbtraceId: string | undefined

  constructor(message: string, status: number, body?: FacebookCapiErrorBody) {
    super(message)
    this.name = 'FacebookCapiError'
    this.status = status
    this.body = body
    this.fbtraceId = body?.error?.fbtrace_id
  }
}

export class FacebookCapiNetworkError extends Error {
  readonly cause: unknown

  constructor(message: string, cause: unknown) {
    super(message)
    this.name = 'FacebookCapiNetworkError'
    this.cause = cause
  }
}
