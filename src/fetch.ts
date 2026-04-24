import { FacebookCapiError, FacebookCapiNetworkError } from './errors.js'
import type { FacebookCapiErrorBody, FacebookCapiResponse } from './types.js'

interface PostOptions {
  url: string
  body: unknown
  timeoutMs: number
  retries: number
  fetchImpl: typeof fetch
}

export async function postJson({
  url,
  body,
  timeoutMs,
  retries,
  fetchImpl,
}: PostOptions): Promise<FacebookCapiResponse> {
  let attempt = 0
  let lastError: unknown

  while (attempt <= retries) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const res = await fetchImpl(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      clearTimeout(timer)

      const text = await res.text()
      const parsed = text ? safeParse(text) : undefined

      if (!res.ok) {
        // Only retry on 5xx — 4xx are user errors and will never succeed.
        if (res.status >= 500 && attempt < retries) {
          attempt++
          await sleep(backoff(attempt))
          continue
        }
        const errBody = parsed as FacebookCapiErrorBody | undefined
        throw new FacebookCapiError(
          errBody?.error?.message ?? `Meta Conversions API returned ${res.status}`,
          res.status,
          errBody,
        )
      }

      return parsed as FacebookCapiResponse
    } catch (err) {
      clearTimeout(timer)
      if (err instanceof FacebookCapiError) throw err
      lastError = err
      if (attempt < retries) {
        attempt++
        await sleep(backoff(attempt))
        continue
      }
      throw new FacebookCapiNetworkError('Meta Conversions API request failed', err)
    }
  }

  throw new FacebookCapiNetworkError('Meta Conversions API request failed', lastError)
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

function backoff(attempt: number): number {
  // 200ms, 400ms, 800ms ... with small jitter
  return 100 * 2 ** attempt + Math.floor(Math.random() * 100)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
