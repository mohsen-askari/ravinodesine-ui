import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sign } from '@/lib/revalidate'
import { config as proxyConfig, proxy } from '@/proxy'

const revalidateTag = vi.fn()
vi.mock('next/cache', () => ({ revalidateTag: (...args: unknown[]) => revalidateTag(...args) }))

const SECRET = '0123456789abcdef0123456789abcdef'
const body = (revision: number) => `{"event":"content.changed","revision":${revision},"scope":"all"}`

function post(revision: number, over: { secret?: string; timestamp?: number } = {}) {
  const timestamp = String(over.timestamp ?? Math.floor(Date.now() / 1000))
  return new Request('https://frontend.test/api/revalidate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-ravino-timestamp': timestamp, 'x-ravino-signature': sign(over.secret ?? SECRET, timestamp, Buffer.from(body(revision))) },
    body: body(revision),
  })
}

beforeEach(() => {
  revalidateTag.mockClear()
  vi.stubEnv('RAVINO_REVALIDATE_SECRET', SECRET)
  vi.spyOn(console, 'info').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('POST /api/revalidate', () => {
  it('marks the content tag stale (served while it is rebuilt) for a valid message and tells caches not to store the answer', async () => {
    const { POST } = await import('@/app/api/revalidate/route')
    const response = await POST(post(1001))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(revalidateTag).toHaveBeenCalledExactlyOnceWith('content', 'max')
  })

  it('does nothing for a message signed with another secret', async () => {
    const { POST } = await import('@/app/api/revalidate/route')
    const response = await POST(post(1002, { secret: 'another-secret-another-secret-12345' }))
    expect(response.status).toBe(401)
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it('does nothing for a stale message', async () => {
    const { POST } = await import('@/app/api/revalidate/route')
    const response = await POST(post(1003, { timestamp: Math.floor(Date.now() / 1000) - 600 }))
    expect(response.status).toBe(401)
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it('answers 503 and revalidates nothing while no secret is configured', async () => {
    vi.stubEnv('RAVINO_REVALIDATE_SECRET', '')
    const { POST } = await import('@/app/api/revalidate/route')
    expect((await POST(post(1004))).status).toBe(503)
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it('acknowledges an exact repeat without expiring the cache twice', async () => {
    const { POST } = await import('@/app/api/revalidate/route')
    const message = post(1005, { timestamp: Math.floor(Date.now() / 1000) })
    const again = message.clone()
    expect((await POST(message)).status).toBe(200)
    expect(await (await POST(again)).json()).toEqual({ ok: true, duplicate: true })
    expect(revalidateTag).toHaveBeenCalledTimes(1)
  })

  it('exports no handler other than POST, so other methods are refused by Next', async () => {
    const route = await import('@/app/api/revalidate/route')
    expect(Object.keys(route)).toEqual(['POST'])
  })
})

describe('locale proxy and the webhook', () => {
  it('does not redirect /api/ paths (a redirect would break the signed POST)', async () => {
    const matcher = new RegExp(`^${proxyConfig.matcher[0]}$`)
    expect(matcher.test('/api/revalidate')).toBe(false)
    expect(matcher.test('/projects')).toBe(true)
    expect(matcher.test('/apiary')).toBe(true) // only the /api/ prefix is exempt
    expect((await proxy(new NextRequest('http://localhost:3000/en/projects')))!.headers.get('location')).toBeNull()
  })
})
