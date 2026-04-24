import type { CapiErrorBody } from './types.js'

export class CapiError extends Error {
  readonly status: number
  readonly body: CapiErrorBody | undefined
  readonly fbtraceId: string | undefined

  constructor(message: string, status: number, body?: CapiErrorBody) {
    super(message)
    this.name = 'CapiError'
    this.status = status
    this.body = body
    this.fbtraceId = body?.error?.fbtrace_id
  }
}

export class CapiNetworkError extends Error {
  readonly cause: unknown

  constructor(message: string, cause: unknown) {
    super(message)
    this.name = 'CapiNetworkError'
    this.cause = cause
  }
}
