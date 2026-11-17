import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MISS_REFRESH_MS, TTL_MS, forgetKnownProjects, projectExists } from '@/content/known-projects'
import { projects } from '@/content/projects'
import { proxy } from '@/proxy'

const fetchMock = vi.fn()
const list = (...slugs: string[]) => new Response(JSON.stringify({ data: slugs.map((slug) => ({ slug })), meta: {} }), { status: 200 })

beforeEach(() => {
  forgetKnownProjects()
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})
const apiMode = () => {
  vi.stubEnv('CONTENT_SOURCE', 'api')
  vi.stubEnv('RAVINO_API_URL', 'https://cms.ravino.test')
}

describe('static mode', () => {
  it('knows exactly the built-in projects and never asks the network', async () => {
    expect(await projectExists('en', projects[0].slug)).toBe(true)
    expect(await projectExists('fa', 'made-up')).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('api mode', () => {
  it('reads the light list once and answers from memory after that', async () => {
    apiMode()
    fetchMock.mockImplementation(async () => list('alpha', 'beta'))

    expect(await projectExists('en', 'alpha', 1_000)).toBe(true)
    expect(await projectExists('en', 'beta', 2_000)).toBe(true)
    expect(await projectExists('en', 'alpha', 3_000)).toBe(true)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('https://cms.ravino.test/api/v1/en/projects')
    expect(fetchMock.mock.calls[0][1].cache).toBe('no-store')
  })

  it('keeps a separate list per language', async () => {
    apiMode()
    fetchMock.mockImplementation(async (url: string) => (url.includes('/fa/') ? list('only-persian') : list('only-english')))

    expect(await projectExists('en', 'only-english', 0)).toBe(true)
    expect(await projectExists('fa', 'only-english', 0)).toBe(false)
    expect(await projectExists('fa', 'only-persian', 0)).toBe(true)
  })

  it('answers "no" from memory for a made-up slug and re-reads at most once per throttle window, however many are tried', async () => {
    apiMode()
    fetchMock.mockImplementation(async () => list('alpha'))
    await projectExists('en', 'alpha', 0)

    for (let i = 0; i < 500; i++) expect(await projectExists('en', `probe-${i}`, 100 + i)).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    expect(await projectExists('en', 'probe-x', MISS_REFRESH_MS + 1)).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    for (let i = 0; i < 500; i++) await projectExists('en', `more-${i}`, MISS_REFRESH_MS + 100 + i)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('finds a project that was published after the list was read, within seconds', async () => {
    apiMode()
    fetchMock.mockImplementationOnce(async () => list('alpha')).mockImplementation(async () => list('alpha', 'fresh'))
    await projectExists('en', 'alpha', 0)

    expect(await projectExists('en', 'fresh', 1_000)).toBe(false) // inside the throttle window
    expect(await projectExists('en', 'fresh', MISS_REFRESH_MS + 1)).toBe(true)
  })

  it('stops answering "yes" for a removed project once the list is old', async () => {
    apiMode()
    fetchMock.mockImplementationOnce(async () => list('alpha', 'gone')).mockImplementation(async () => list('alpha'))
    await projectExists('en', 'gone', 0)

    expect(await projectExists('en', 'gone', TTL_MS - 1)).toBe(true)
    expect(await projectExists('en', 'gone', TTL_MS + 1)).toBe(false)
  })

  it('keeps answering from the last list when the API goes down, and asks again at most once per window', async () => {
    apiMode()
    fetchMock.mockImplementationOnce(async () => list('alpha')).mockRejectedValue(new TypeError('fetch failed'))
    expect(await projectExists('en', 'alpha', 0)).toBe(true)

    // The list is older than its lifetime and the API is down: the last list still decides, a made-up slug is "no".
    expect(await projectExists('en', 'alpha', TTL_MS + 1)).toBe(true)
    for (let i = 0; i < 200; i++) expect(await projectExists('en', `outage-${i}`, TTL_MS + 2 + i)).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(2) // the first read and one failed attempt

    expect(await projectExists('en', 'alpha', TTL_MS + MISS_REFRESH_MS + 10)).toBe(true) // next window: one more attempt
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('catches up as soon as the API is back', async () => {
    apiMode()
    fetchMock.mockImplementationOnce(async () => list('alpha')).mockRejectedValueOnce(new TypeError('down')).mockImplementation(async () => list('alpha', 'fresh'))
    await projectExists('en', 'alpha', 0)
    expect(await projectExists('en', 'fresh', TTL_MS + 1)).toBe(false)
    expect(await projectExists('en', 'fresh', TTL_MS + MISS_REFRESH_MS + 2)).toBe(true)
  })

  it('shares one request between simultaneous lookups', async () => {
    apiMode()
    fetchMock.mockImplementation(async () => list('alpha'))

    const answers = await Promise.all(Array.from({ length: 20 }, (_, i) => projectExists('en', i === 0 ? 'alpha' : `x${i}`, 0)))

    expect(answers[0]).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['an unreachable API', () => fetchMock.mockRejectedValue(new TypeError('fetch failed'))],
    ['an error status', () => fetchMock.mockResolvedValue(new Response('x', { status: 503 }))],
    ['a body that is not a list', () => fetchMock.mockResolvedValue(new Response('{"data":"x"}', { status: 200 }))],
    ['a body that is not JSON', () => fetchMock.mockResolvedValue(new Response('<html>', { status: 200 }))],
  ])('fails open (lets the page decide) with %s, and does not remember the failure', async (_name, arrange) => {
    apiMode()
    arrange()
    expect(await projectExists('en', 'anything', 0)).toBe(true)

    fetchMock.mockReset()
    fetchMock.mockImplementation(async () => list('alpha'))
    expect(await projectExists('en', 'anything', 1)).toBe(false)
  })
})

describe('the proxy gate', () => {
  const go = (path: string) => proxy(new NextRequest(`http://localhost:3000${path}`))
  /** A made-up address is answered by the proxy itself: status 404 and the bilingual page, never passed on. */
  const isNotFound = (response: Awaited<ReturnType<typeof go>>) => response!.status === 404 && !response!.headers.has('x-middleware-next')
  const slug = projects[0].slug

  it('lets real pages through: overview, a project, with or without a trailing slash, in both languages', async () => {
    for (const path of ['/en/projects', '/en/projects/', `/en/projects/${slug}`, `/fa/projects/${slug}/`, '/fa/studio', '/en/contact', '/en']) {
      const response = await go(path)
      expect(response!.status, path).toBe(200)
      expect(response!.headers.get('x-middleware-next'), path).toBe('1')
    }
  })

  it('answers 404 itself for anything under /projects/ that is not a project', async () => {
    for (const path of ['/en/projects/made-up', '/fa/projects/Probe_1%20x', '/en/projects/a/b', `/en/projects/${slug}/extra`, '/en/projects/%E0%A4%A', '/en/projects//x']) {
      const response = await go(path)
      expect(isNotFound(response), path).toBe(true)
      expect(await response!.text(), path).toContain('Page not found · صفحه پیدا نشد')
      expect(response!.headers.get('cache-control'), path).toBe('no-cache')
    }
  })

  it('does not touch other paths, and still redirects an address without a language', async () => {
    expect(isNotFound(await go('/en/anything-else'))).toBe(false)
    expect((await go('/projects/x'))!.headers.get('location')).toBe('http://localhost:3000/en/projects/x')
  })
})
