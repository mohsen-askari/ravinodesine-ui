import { createHmac } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CONTENT_TAG,
  MAX_BODY_BYTES,
  ReplayGuard,
  handleRevalidation,
  readConfig,
  sign,
  type Deps,
} from '@/lib/revalidate'

const SECRET = '0123456789abcdef0123456789abcdef'
const PREVIOUS = 'fedcba9876543210fedcba9876543210'
const NOW_S = 1761210842
const BODY = '{"event":"content.changed","revision":129,"scope":"all"}'

/** Computed independently with Python: hmac.new(SECRET, b"1761210842." + BODY, sha256).hexdigest() */
const VECTOR = 'sha256=c1b57391e567504527c6c3d614aa5ccafbb1d577ff149cadafb1e1c35dd77f22'

let revalidate: ReturnType<typeof vi.fn>
let logged: string[]
let deps: Deps

beforeEach(() => {
  revalidate = vi.fn()
  logged = []
  deps = {
    config: { secrets: [SECRET], toleranceSeconds: 300 },
    revalidate: revalidate as unknown as () => void,
    guard: new ReplayGuard(),
    nowMs: () => NOW_S * 1000,
    log: (m) => logged.push(m),
  }
})

function message(over: { body?: string; timestamp?: string | number; signature?: string; secret?: string; headers?: Record<string, string | null> } = {}) {
  const body = over.body ?? BODY
  const timestamp = String(over.timestamp ?? NOW_S)
  const signature = over.signature ?? sign(over.secret ?? SECRET, timestamp, Buffer.from(body))
  const headers: Record<string, string> = { 'content-type': 'application/json', 'x-ravino-timestamp': timestamp, 'x-ravino-signature': signature }
  for (const [k, v] of Object.entries(over.headers ?? {})) {
    if (v === null) delete headers[k]
    else headers[k] = v
  }
  return new Request('https://frontend.test/api/revalidate', { method: 'POST', headers, body })
}

const run = (request: Request) => handleRevalidation(request, deps)

describe('signature', () => {
  it('matches the independently computed test vector', () => {
    expect(sign(SECRET, String(NOW_S), Buffer.from(BODY))).toBe(VECTOR)
  })

  it('is over "<timestamp>.<body>", not over the body alone', () => {
    const bodyOnly = 'sha256=' + createHmac('sha256', SECRET).update(BODY).digest('hex')
    expect(sign(SECRET, String(NOW_S), Buffer.from(BODY))).not.toBe(bodyOnly)
  })
})

describe('a valid message', () => {
  it('is accepted exactly once and expires the content tag', async () => {
    const out = await run(message())
    expect(out).toEqual({ status: 200, body: { ok: true } })
    expect(revalidate).toHaveBeenCalledTimes(1)
  })

  it('is accepted with the test vector headers', async () => {
    const out = await run(message({ signature: VECTOR }))
    expect(out.status).toBe(200)
  })

  it('accepts an upper-case hex signature', async () => {
    const out = await run(message({ signature: 'sha256=' + VECTOR.slice(7).toUpperCase() }))
    expect(out.status).toBe(200)
  })

  it('is accepted right at the edge of the window, on either side', async () => {
    expect((await run(message({ timestamp: NOW_S - 300 }))).status).toBe(200)
    expect((await run(message({ timestamp: NOW_S + 300, body: BODY.replace('129', '130') }))).status).toBe(200)
  })

  it('never logs the secret, the signature or the body', async () => {
    await run(message())
    await run(message({ secret: PREVIOUS }))
    const text = logged.join('\n')
    for (const secret of [SECRET, PREVIOUS, VECTOR.slice(7), 'content.changed']) expect(text).not.toContain(secret)
  })
})

describe('invalid requests never revalidate', () => {
  const cases: [string, () => Request][] = [
    ['a wrong secret', () => message({ secret: PREVIOUS })],
    ['a changed body', () => message({ signature: sign(SECRET, String(NOW_S), Buffer.from(BODY)), body: BODY.replace('129', '999') })],
    ['a changed timestamp', () => message({ signature: VECTOR, timestamp: NOW_S + 1 })],
    ['a signature over the body only (the old scheme)', () => message({ signature: 'sha256=' + createHmac('sha256', SECRET).update(BODY).digest('hex') })],
    ['a signature of the right length that is all zeros', () => message({ signature: 'sha256=' + '0'.repeat(64) })],
    ['a missing signature', () => message({ headers: { 'x-ravino-signature': null } })],
    ['a missing timestamp', () => message({ headers: { 'x-ravino-timestamp': null } })],
    ['a signature without the sha256= prefix', () => message({ signature: VECTOR.slice(7) })],
    ['a signature of the wrong length', () => message({ signature: VECTOR.slice(0, -2) })],
    ['a signature with non-hex characters', () => message({ signature: 'sha256=' + 'z'.repeat(64) })],
    ['a non-numeric timestamp', () => message({ timestamp: '17612x0842' })],
    ['a fractional timestamp', () => message({ timestamp: '1761210842.5' })],
    ['a negative timestamp', () => message({ timestamp: '-1761210842' })],
    ['an empty timestamp', () => message({ timestamp: '' })],
  ]

  it.each(cases)('%s → 401', async (_name, build) => {
    const out = await run(build())
    expect(out).toEqual({ status: 401, body: { error: 'unauthorized' } })
    expect(revalidate).not.toHaveBeenCalled()
  })

  it('refuses a correctly signed message that is too old, and one from the future', async () => {
    for (const offset of [-301, 301, -86400, 86400]) {
      const out = await run(message({ timestamp: NOW_S + offset }))
      expect(out, `offset ${offset}`).toEqual({ status: 401, body: { error: 'unauthorized' } })
    }
    expect(revalidate).not.toHaveBeenCalled()
  })

  it('answers every authentication failure identically, so they cannot be told apart', async () => {
    const bodies = await Promise.all([message({ secret: PREVIOUS }), message({ timestamp: NOW_S - 1000 }), message({ headers: { 'x-ravino-signature': null } })].map(async (m) => JSON.stringify(await run(m))))
    expect(new Set(bodies).size).toBe(1)
  })

  it('applies the window in force, which can be configured', async () => {
    deps.config.toleranceSeconds = 30
    expect((await run(message({ timestamp: NOW_S - 31 }))).status).toBe(401)
    expect((await run(message({ timestamp: NOW_S - 30 }))).status).toBe(200)
  })

  it('refuses a body above the limit without reading it into the signature check', async () => {
    const big = 'x'.repeat(MAX_BODY_BYTES + 1)
    expect((await run(message({ body: big }))).status).toBe(413)
    expect(revalidate).not.toHaveBeenCalled()
  })

  it('refuses a body above the limit even when no length is declared', async () => {
    const big = new TextEncoder().encode('x'.repeat(MAX_BODY_BYTES + 1))
    const stream = new ReadableStream({ start: (c) => { c.enqueue(big.slice(0, 600)); c.enqueue(big.slice(600)); c.close() } })
    const request = new Request('https://frontend.test/api/revalidate', {
      method: 'POST',
      body: stream,
      duplex: 'half',
      headers: { 'x-ravino-timestamp': String(NOW_S), 'x-ravino-signature': VECTOR },
    } as RequestInit)
    expect((await run(request)).status).toBe(413)
    expect(revalidate).not.toHaveBeenCalled()
  })
})

describe('a correctly signed message with a bad payload', () => {
  it.each([
    ['not JSON', 'nope'],
    ['an array', '[]'],
    ['a wrong event', '{"event":"content.deleted","revision":1,"scope":"all"}'],
    ['a wrong scope', '{"event":"content.changed","revision":1,"scope":"projects"}'],
    ['a missing revision', '{"event":"content.changed","scope":"all"}'],
    ['a string revision', '{"event":"content.changed","revision":"1","scope":"all"}'],
    ['a zero revision', '{"event":"content.changed","revision":0,"scope":"all"}'],
    ['a fractional revision', '{"event":"content.changed","revision":1.5,"scope":"all"}'],
    ['a NUL byte', '\u0000'],
  ])('%s → 400, nothing revalidated', async (_name, body) => {
    expect(await run(message({ body }))).toEqual({ status: 400, body: { error: 'bad_payload' } })
    expect(revalidate).not.toHaveBeenCalled()
  })
})

describe('configuration', () => {
  it.each([
    ['no secret', []],
    ['a secret shorter than 32 bytes', ['too-short']],
    ['a short previous secret', [SECRET, 'x'.repeat(31)]],
  ])('%s → 503 and nothing is trusted', async (_name, secrets) => {
    deps.config.secrets = secrets
    expect((await run(message())).status).toBe(503)
    expect(revalidate).not.toHaveBeenCalled()
  })

  it('reads the secrets and the window from the environment', () => {
    expect(readConfig({ RAVINO_REVALIDATE_SECRET: SECRET, RAVINO_REVALIDATE_SECRET_PREVIOUS: PREVIOUS, RAVINO_REVALIDATE_TOLERANCE_SECONDS: '120' })).toEqual({ secrets: [SECRET, PREVIOUS], toleranceSeconds: 120 })
    expect(readConfig({})).toEqual({ secrets: [], toleranceSeconds: 300 })
    expect(readConfig({ RAVINO_REVALIDATE_SECRET: '' }).secrets).toEqual([])
  })

  it.each(['abc', '0', '-5', '3601', '1.5', ''])('falls back to five minutes for a window of "%s"', (value) => {
    expect(readConfig({ RAVINO_REVALIDATE_TOLERANCE_SECONDS: value }).toleranceSeconds).toBe(300)
  })

  it('accepts the previous secret during a rotation and the new one afterwards', async () => {
    deps.config.secrets = [SECRET, PREVIOUS]
    expect((await run(message({ secret: PREVIOUS }))).status).toBe(200)
    expect((await run(message({ secret: SECRET, body: BODY.replace('129', '130') }))).status).toBe(200)
    deps.config.secrets = [SECRET]
    expect((await run(message({ secret: PREVIOUS, body: BODY.replace('129', '131') }))).status).toBe(401)
  })

  it('exposes the tag the data layer caches under', () => {
    expect(CONTENT_TAG).toBe('content')
  })
})

describe('duplicate and repeated delivery', () => {
  it('acknowledges an exact repeat without doing the work again', async () => {
    expect((await run(message())).body).toEqual({ ok: true })
    expect(await run(message())).toEqual({ status: 200, body: { ok: true, duplicate: true } })
    expect(revalidate).toHaveBeenCalledTimes(1)
  })

  it('treats a retry (same revision, new timestamp) as a new message and revalidates again, which is harmless', async () => {
    await run(message())
    deps.nowMs = () => (NOW_S + 60) * 1000
    expect((await run(message({ timestamp: NOW_S + 60 }))).body).toEqual({ ok: true })
    expect(revalidate).toHaveBeenCalledTimes(2)
  })

  it('does not ignore a lower revision: a restored backend counts from a lower number and must still be heard', async () => {
    await run(message({ body: BODY.replace('129', '500') }))
    expect((await run(message({ body: BODY.replace('129', '3'), timestamp: NOW_S + 1 }))).body).toEqual({ ok: true })
    expect(revalidate).toHaveBeenCalledTimes(2)
  })

  it('forgets a message once it could no longer pass the timestamp check', async () => {
    await run(message())
    deps.nowMs = () => (NOW_S + 302) * 1000
    expect((await run(message())).status).toBe(401) // too old to be accepted again, replayed or not
    expect(revalidate).toHaveBeenCalledTimes(1)
  })

  it('does not remember a message whose revalidation failed, so the retry is processed', async () => {
    revalidate.mockImplementationOnce(() => {
      throw new Error('cache unavailable')
    })
    expect((await run(message())).status).toBe(500)
    expect((await run(message())).body).toEqual({ ok: true })
    expect(revalidate).toHaveBeenCalledTimes(2)
  })

  it('does not remember a rejected message either', async () => {
    await run(message({ signature: 'sha256=' + '0'.repeat(64) }))
    expect((await run(message())).body).toEqual({ ok: true })
  })

  it('keeps its memory bounded', () => {
    const guard = new ReplayGuard(3)
    for (let i = 0; i < 10; i++) guard.add(`k${i}`, 10_000, 0)
    expect(['k0', 'k6', 'k7', 'k8', 'k9'].map((k) => guard.has(k, 0))).toEqual([false, false, true, true, true])
  })
})
