import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ContentApiError } from '@/content/api'
import { projects } from '@/content/projects'
import { apiBase, contentSource, getProjects, getSite, getStaticParams, localesWithProject } from '@/content/source'

const fixture = (name: string): unknown => JSON.parse(readFileSync(path.resolve(__dirname, '../fixtures/api', `${name}.json`), 'utf8'))

const fetchMock = vi.fn()
beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

const apiMode = () => {
  vi.stubEnv('CONTENT_SOURCE', 'api')
  vi.stubEnv('RAVINO_API_URL', 'https://cms.ravino.test/')
}
const answer = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const serve = (routes: Record<string, unknown>) =>
  fetchMock.mockImplementation(async (url: string) => {
    const hit = Object.entries(routes).find(([suffix]) => url.endsWith(suffix))
    return hit ? answer(hit[1]) : answer({ error: 'not_found' }, 404)
  })

describe('which source is used', () => {
  it('is static unless told otherwise, and never touches the network then', async () => {
    expect(contentSource({})).toBe('static')
    expect(contentSource({ CONTENT_SOURCE: '' })).toBe('static')
    expect(contentSource({ CONTENT_SOURCE: 'static' })).toBe('static')
    expect((await getProjects('en')).map((p) => p.slug)).toEqual(projects.map((p) => p.slug))
    expect((await getSite('fa')).contact.email).toBe('hello@ravino.studio')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('switches to the API only for the exact value "api"', () => {
    expect(contentSource({ CONTENT_SOURCE: 'api' })).toBe('api')
    expect(() => contentSource({ CONTENT_SOURCE: 'API' })).toThrow(/"static" or "api"/)
    expect(() => contentSource({ CONTENT_SOURCE: 'cms' })).toThrow()
  })

  it('needs a valid backend address in api mode', () => {
    expect(apiBase({ RAVINO_API_URL: 'https://cms.ravino.test/' })).toBe('https://cms.ravino.test')
    expect(apiBase({ RAVINO_API_URL: 'http://127.0.0.1:8000' })).toBe('http://127.0.0.1:8000')
    for (const bad of [undefined, '', 'cms.ravino.test', 'ftp://cms.ravino.test']) expect(() => apiBase({ RAVINO_API_URL: bad })).toThrow(/RAVINO_API_URL/)
  })
})

describe('api mode', () => {
  it('fetches the story list of the locale under the content tag, server side, and maps it', async () => {
    apiMode()
    serve({ '/api/v1/fa/projects?include=story': fixture('projects-fa') })

    const views = await getProjects('fa')

    expect(views).toHaveLength(8)
    expect(views[0].title).toBe('پاویون نصف‌النهار')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://cms.ravino.test/api/v1/fa/projects?include=story')
    expect(init.next).toEqual({ revalidate: 3600, tags: ['content'] })
    expect(init.headers).toEqual({ Accept: 'application/json' })
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('fetches the site under the same tag', async () => {
    apiMode()
    serve({ '/api/v1/en/site': fixture('site-en') })

    const site = await getSite('en')

    expect(site.contact.web).toBe('www.ravino.studio')
    expect(site.social).toEqual([])
    expect(fetchMock.mock.calls[0][1].next.tags).toEqual(['content'])
  })

  it('does not fall back to the demo content when the API fails: the error surfaces', async () => {
    apiMode()
    serve({})
    await expect(getProjects('en')).rejects.toThrow(ContentApiError)

    fetchMock.mockRejectedValue(new TypeError('fetch failed'))
    await expect(getSite('en')).rejects.toThrow('fetch failed')

    fetchMock.mockResolvedValue(new Response('<html>bad gateway</html>', { status: 200 }))
    await expect(getProjects('en')).rejects.toThrow()
  })

  it('fails clearly when the address is missing', async () => {
    vi.stubEnv('CONTENT_SOURCE', 'api')
    vi.stubEnv('RAVINO_API_URL', '')
    await expect(getProjects('en')).rejects.toThrow(/RAVINO_API_URL/)
  })

  it('prebuilds exactly the pages that exist: only the projects public in each language', async () => {
    apiMode()
    const en = fixture('projects-en') as { data: { slug: string }[]; meta: unknown }
    const faOnlyFirstTwo = { ...(fixture('projects-fa') as object), data: (fixture('projects-fa') as { data: unknown[] }).data.slice(0, 2) }
    serve({ '/api/v1/en/projects?include=story': en, '/api/v1/fa/projects?include=story': faOnlyFirstTwo })

    const params = await getStaticParams()

    expect(params.filter((p) => p.locale === 'en')).toHaveLength(1 + en.data.length)
    expect(params.filter((p) => p.locale === 'fa')).toHaveLength(1 + 2)
    expect(params).toContainEqual({ locale: 'fa', slug: [] })
    expect(params).not.toContainEqual({ locale: 'fa', slug: [en.data[5].slug] })
    expect(await localesWithProject(en.data[0].slug)).toEqual(['en', 'fa'])
    expect(await localesWithProject(en.data[5].slug)).toEqual(['en'])
  })
})
