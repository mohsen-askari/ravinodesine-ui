import { createHmac } from 'node:crypto'
import { request as httpRequest } from 'node:http'
import { expect, test, type Page } from '@playwright/test'

/**
 * The whole path in API mode, against a running production server: content comes from the (mock) API, is cached, and
 * changes only when a correctly signed webhook arrives. Runs through `npm run test:e2e:api`.
 */
const SECRET = process.env.RAVINO_REVALIDATE_SECRET!
const MOCK = `http://127.0.0.1:${process.env.E2E_MOCK_PORT ?? 4010}`

let revision = 1000
const body = () => JSON.stringify({ event: 'content.changed', revision: ++revision, scope: 'all' })
const sign = (timestamp: number | string, raw: string, secret = SECRET) => 'sha256=' + createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest('hex')
const nowS = () => Math.floor(Date.now() / 1000)

async function webhook(page: Page, over: { raw?: string; timestamp?: number | string; signature?: string; secret?: string } = {}) {
  const raw = over.raw ?? body()
  const timestamp = over.timestamp ?? nowS()
  const response = await page.request.post('/api/revalidate', {
    data: raw,
    headers: { 'content-type': 'application/json', 'x-ravino-timestamp': String(timestamp), 'x-ravino-signature': over.signature ?? sign(timestamp, raw, over.secret) },
  })
  return { status: response.status(), json: await response.json() }
}
const cms = (page: Page, change: object) => page.request.post(`${MOCK}/__state`, { data: change })
/** After a webhook the first request may still get the previous copy while the new one is built; the next gets the new one. */
const eventually = <T>(_page: Page, read: () => Promise<T>, expected: T, timeout = 8_000) => expect.poll(read, { timeout, intervals: [100, 200, 400, 1000, 2000] }).toBe(expected)
const phone = async (page: Page, locale = 'en') => (await (await page.request.get(`/${locale}/contact`)).text()).match(/href="tel:([+\d]+)"/)?.[1]

test.describe.configure({ mode: 'serial' })

test('the site is served from the API and caches it', async ({ page }) => {
  expect(await phone(page)).toBe('+982155550142')
  await cms(page, { phone: '+98 21 0000 0001' })
  expect(await phone(page), 'a change in the CMS is not visible before the webhook').toBe('+982155550142')
})

test('an invalid or stale message changes nothing, whatever is wrong with it', async ({ page }) => {
  const raw = body()
  const attempts = [
    ['a wrong secret', await webhook(page, { raw, secret: 'a'.repeat(64) })],
    ['a stale timestamp', await webhook(page, { timestamp: nowS() - 3600 })],
    ['a future timestamp', await webhook(page, { timestamp: nowS() + 3600 })],
    ['a signature over the body only', await webhook(page, { raw, signature: 'sha256=' + createHmac('sha256', SECRET).update(raw).digest('hex') })],
    ['a tampered body', await webhook(page, { raw: raw.replace(/"revision":\d+/, '"revision":1'), signature: sign(nowS(), raw) })],
    ['no signature', await webhook(page, { signature: '' })],
  ] as const
  for (const [what, result] of attempts) expect(result.status, what).toBe(401)
  expect(await phone(page), 'nothing was revalidated').toBe('+982155550142')
  const get = await page.request.get('/api/revalidate')
  expect(get.status(), 'only POST exists').toBe(405)
})

test('a signed message makes the new content appear in both languages, and the pages stay up', async ({ page }) => {
  const raw = body()
  const timestamp = nowS()
  expect(await webhook(page, { raw, timestamp })).toEqual({ status: 200, json: { ok: true } })

  await eventually(page, () => phone(page, 'en'), '+982100000001')
  await eventually(page, () => phone(page, 'fa'), '+982100000001')
  for (const path of ['/en/projects', '/fa/projects', '/en/projects/zagros-lodge', '/en/studio', '/fa/contact']) {
    expect((await page.request.get(path)).status(), path).toBe(200)
  }

  // The same message again (a retry that crossed with the first delivery) is acknowledged and harmless.
  expect(await webhook(page, { raw, timestamp })).toEqual({ status: 200, json: { ok: true, duplicate: true } })
  expect(await phone(page)).toBe('+982100000001')
  // ...and a retry of the same revision (a new timestamp, so a new message) is simply processed again, harmlessly.
  expect((await webhook(page, { raw, timestamp: nowS() + 1 })).status).toBe(200)
  expect(await phone(page)).toBe('+982100000001')
})

test('the footer has no social column until the CMS has links, then shows exactly those', async ({ page }) => {
  await page.goto('/en/studio')
  await expect(page.locator('footer')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Social' })).toHaveCount(0)
  await expect(page.locator('footer a[href*="instagram"], footer a[href*="linkedin"]')).toHaveCount(0)

  await cms(page, { social: [{ platform: 'instagram', url: 'https://www.instagram.com/ravino.studio/' }] })
  expect((await webhook(page)).status).toBe(200)

  await expect.poll(async () => (await (await page.request.get('/en/studio')).text()).includes('instagram.com/ravino.studio'), { timeout: 8_000 }).toBe(true)
  await page.goto('/en/studio')
  await expect(page.getByRole('heading', { name: 'Social' })).toBeVisible()
  await expect(page.locator('footer a[href="https://www.instagram.com/ravino.studio/"]')).toHaveText('Instagram')
  await expect(page.locator('footer a[rel="noopener noreferrer"]')).toHaveCount(1)

  await cms(page, { social: [] })
  await webhook(page)
  await expect.poll(async () => (await (await page.request.get('/fa/studio')).text()).includes('instagram.com'), { timeout: 8_000 }).toBe(false)
  await page.goto('/fa/studio')
  await expect(page.getByRole('heading', { name: 'شبکه‌های اجتماعی' })).toHaveCount(0)
})

test('a project added in the CMS gets its page on demand, and a removed one disappears', async ({ page }) => {
  expect((await page.request.get('/en/projects/new-pavilion')).status(), 'unknown before it exists').toBe(404)

  await cms(page, { addProject: 'new-pavilion' })
  await webhook(page)
  await eventually(page, async () => (await page.request.get('/en/projects/new-pavilion')).status(), 200)
  const overviewHas = async (slug: string) => (await (await page.request.get('/en/projects')).text()).includes(`data-row="${slug}"`)
  await eventually(page, () => overviewHas('new-pavilion'), true)

  await cms(page, { removeProject: 'new-pavilion' })
  await webhook(page)
  await eventually(page, async () => (await page.request.get('/en/projects/new-pavilion')).status(), 404)
  await eventually(page, () => overviewHas('new-pavilion'), false)
  await page.goto('/en/projects')
  await expect(page.locator('[data-row="new-pavilion"]')).toHaveCount(0)
  await expect(page.locator('[data-row="zagros-lodge"]')).toHaveCount(1)
})

test('a failed refresh keeps the last good pages up, and the site catches up when the API returns', async ({ page }) => {
  test.setTimeout(120_000) // after a failed rebuild Next waits about 30 s before trying again
  await cms(page, { phone: '+98 21 0000 0002' })
  await webhook(page)
  await eventually(page, () => phone(page), '+982100000002')

  await cms(page, { down: true, phone: '+98 21 0000 0003' })
  expect((await webhook(page)).status).toBe(200)
  for (let i = 0; i < 3; i++) {
    for (const path of ['/en/contact', '/fa/contact', '/en/projects', '/fa/projects/zagros-lodge', '/en/studio']) {
      expect((await page.request.get(path)).status(), `${path} while the API is down (request ${i + 1})`).toBe(200)
    }
  }
  expect(await phone(page), 'the last good content, not an error and not demo copy').toBe('+982100000002')

  await cms(page, { down: false })
  await eventually(page, () => phone(page), '+982100000003', 90_000)
})

test('visiting the same pages again does not stall (no stale-while-revalidate caching in the browser)', async ({ page }) => {
  for (let i = 0; i < 3; i++) {
    const started = Date.now()
    await page.goto('/en/projects', { waitUntil: 'networkidle' })
    expect(Date.now() - started, `visit ${i + 1}`).toBeLessThan(10_000)
  }
  const response = await page.request.get('/en/projects')
  expect(response.headers()['cache-control']).toBe('no-cache')
})

test('made-up addresses answer 404 and leave nothing in the page cache', async ({ page }) => {
  const { readdirSync } = await import('node:fs')
  const cached = () => readdirSync(`${process.env.NEXT_DIST_DIR ?? '.next'}/server/app/en/projects`).length
  const before = cached()

  for (let i = 0; i < 60; i++) {
    for (const path of [`/en/projects/probe-${i}`, `/fa/projects/probe-${i}`, `/en/projects/Probe_${i}%20x`, `/en/projects/zagros-lodge/probe-${i}`]) {
      expect((await page.request.get(path)).status(), path).toBe(404)
    }
  }

  expect(cached(), 'no cached copy of the 404 page per made-up address').toBe(before)

  // Behind a reverse proxy the Host header names the public site and X-Forwarded-Proto says https. The 404 rewrite must not
  // then be treated as an external one (it used to fail with a 500: found only when run behind a TLS proxy). Playwright's
  // request API overrides Host, so this uses Node's http client directly.
  const viaProxy = (path: string) =>
    new Promise<number>((resolve, reject) => {
      const request = httpRequest({ host: '127.0.0.1', port: Number(process.env.E2E_API_PORT ?? 3104), path, headers: { host: 'localhost:8443', 'x-forwarded-proto': 'https', 'x-forwarded-host': 'localhost:8443' } }, (response) => {
        response.resume()
        resolve(response.statusCode ?? 0)
      })
      request.on('error', reject)
      request.end()
    })
  for (const path of ['/en/projects/proxied-probe', '/fa/projects/proxied-probe', '/en/projects/zagros-lodge/extra']) {
    expect(await viaProxy(path), `${path} with proxy headers`).toBe(404)
  }
  expect(await viaProxy('/en/projects/zagros-lodge'), 'a real project through the same headers').toBe(200)
  expect((await page.request.get('/en/projects/zagros-lodge')).status(), 'real projects are unaffected').toBe(200)
})
