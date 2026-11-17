import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { MIN_SECRET_BYTES } from './config-check'

export { MIN_SECRET_BYTES }

/**
 * Receiver for the backend's "content changed" webhook (docs/architecture/api-contract.md §4).
 *
 * The message is `POST` with the headers `X-Ravino-Timestamp` (Unix seconds) and `X-Ravino-Signature`
 * (`sha256=` + hex HMAC-SHA256 of the string `<timestamp>.<raw body>`). Nothing in the body is trusted, parsed or acted
 * on until the signature over the exact raw bytes has been verified; an invalid, stale or oversized request never
 * triggers a revalidation. All authentication failures get the same answer so they cannot be told apart from outside.
 */

export const MAX_BODY_BYTES = 1024
export const DEFAULT_TOLERANCE_SECONDS = 300
export const CONTENT_TAG = 'content'

export interface RevalidateConfig {
  /** Current secret first, then the previous one while a rotation is under way. */
  secrets: string[]
  toleranceSeconds: number
}

/** Reads the settings from the environment. Invalid tolerance values fall back to the five-minute default. */
export function readConfig(env: Record<string, string | undefined> = process.env): RevalidateConfig {
  const secrets = [env.RAVINO_REVALIDATE_SECRET, env.RAVINO_REVALIDATE_SECRET_PREVIOUS].filter((s): s is string => !!s && s.length > 0)
  const tolerance = Number(env.RAVINO_REVALIDATE_TOLERANCE_SECONDS)
  return {
    secrets,
    toleranceSeconds: Number.isInteger(tolerance) && tolerance >= 1 && tolerance <= 3600 ? tolerance : DEFAULT_TOLERANCE_SECONDS,
  }
}

/** The signature the backend computes: HMAC-SHA256 over `<timestamp>.<raw body>`, hex, prefixed `sha256=`. */
export function sign(secret: string, timestamp: string, rawBody: Uint8Array): string {
  return 'sha256=' + createHmac('sha256', secret).update(`${timestamp}.`).update(rawBody).digest('hex')
}

/** Constant-time check of a header value against the signature expected for one secret. */
function matches(secret: string, timestamp: string, rawBody: Uint8Array, header: string): boolean {
  const expected = Buffer.from(sign(secret, timestamp, rawBody).slice('sha256='.length), 'hex')
  const given = Buffer.from(header.slice('sha256='.length), 'hex') // header is already known to be 64 hex digits
  return given.length === expected.length && timingSafeEqual(given, expected)
}

/** Remembers messages already acted on, for as long as they could still pass the timestamp check. */
export class ReplayGuard {
  private seen = new Map<string, number>()

  constructor(private readonly maxEntries = 1000) {}

  has(key: string, nowMs: number): boolean {
    this.prune(nowMs)
    return this.seen.has(key)
  }

  add(key: string, expiresAtMs: number, nowMs: number): void {
    this.prune(nowMs)
    if (this.seen.size >= this.maxEntries) this.seen.delete(this.seen.keys().next().value as string) // oldest first
    this.seen.set(key, expiresAtMs)
  }

  private prune(nowMs: number): void {
    for (const [key, expires] of this.seen) if (expires <= nowMs) this.seen.delete(key)
  }
}

export interface Deps {
  config: RevalidateConfig
  /** Expires the cached content. Must be idempotent. */
  revalidate: () => void
  guard: ReplayGuard
  nowMs?: () => number
  log?: (message: string) => void
}

export interface Outcome {
  status: number
  body: Record<string, unknown>
}

const unauthorized: Outcome = { status: 401, body: { error: 'unauthorized' } }

/** Reads at most `limit` bytes of the body; `null` when the body is larger. */
export async function readBody(request: Request, limit = MAX_BODY_BYTES): Promise<Uint8Array | null> {
  const declared = Number(request.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > limit) return null
  if (!request.body) return new Uint8Array()

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > limit) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks)
}

export async function handleRevalidation(request: Request, deps: Deps): Promise<Outcome> {
  const nowMs = (deps.nowMs ?? Date.now)()
  const log = deps.log ?? (() => {})
  const { secrets, toleranceSeconds } = deps.config

  if (secrets.length === 0 || secrets.some((s) => Buffer.byteLength(s) < MIN_SECRET_BYTES)) {
    log('rejected: not_configured')
    return { status: 503, body: { error: 'not_configured' } }
  }

  const raw = await readBody(request)
  if (raw === null) {
    log('rejected: too_large')
    return { status: 413, body: { error: 'too_large' } }
  }

  const timestamp = request.headers.get('x-ravino-timestamp') ?? ''
  const signature = request.headers.get('x-ravino-signature') ?? ''
  if (!/^\d{1,12}$/.test(timestamp) || !/^sha256=[0-9a-fA-F]{64}$/.test(signature)) {
    log('rejected: bad_headers')
    return unauthorized
  }
  if (Math.abs(nowMs / 1000 - Number(timestamp)) > toleranceSeconds) {
    log('rejected: stale')
    return unauthorized
  }
  // Every configured secret is always checked, so the time taken does not reveal which one (if any) matched.
  const verified = secrets.map((secret) => matches(secret, timestamp, raw, signature)).some(Boolean)
  if (!verified) {
    log('rejected: bad_signature')
    return unauthorized
  }

  // Authentic from here on. An exact repeat of a message already handled is acknowledged without doing the work again.
  const key = createHash('sha256').update(signature.toLowerCase()).digest('hex')
  if (deps.guard.has(key, nowMs)) {
    log('duplicate')
    return { status: 200, body: { ok: true, duplicate: true } }
  }

  const payload = parsePayload(raw)
  if (payload === null) {
    log('rejected: bad_payload')
    return { status: 400, body: { error: 'bad_payload' } }
  }

  try {
    deps.revalidate()
  } catch {
    log('failed: revalidate_error')
    return { status: 500, body: { error: 'revalidate_failed' } } // not remembered, so the backend's retry is processed
  }
  deps.guard.add(key, nowMs + (toleranceSeconds + 1) * 1000, nowMs)
  log(`accepted: revision ${payload.revision}`)
  return { status: 200, body: { ok: true } }
}

function parsePayload(raw: Uint8Array): { revision: number } | null {
  let data: unknown
  try {
    data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw))
  } catch {
    return null
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return null
  const { event, revision, scope } = data as Record<string, unknown>
  if (event !== 'content.changed' || scope !== 'all') return null
  if (typeof revision !== 'number' || !Number.isSafeInteger(revision) || revision < 1) return null
  return { revision }
}
