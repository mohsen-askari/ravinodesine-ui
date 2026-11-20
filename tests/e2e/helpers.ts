import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

export const SLUGS = [
  'meridian-pavilion',
  'tehran-terraces',
  'caspian-reading-house',
  'zagros-lodge',
  'hormuz-shore-walk',
  'green-spine-masterplan',
  'naqsh-atelier-interior',
  'kavir-observatory',
] as const

export const row = (page: Page, slug: string) => page.locator(`[data-row="${slug}"]`)
export const heroLink = (page: Page, slug: string) => row(page, slug).locator('[data-panel="hero"]')
export const scroller = (page: Page, slug: string) => row(page, slug).locator('[data-scroller]')
export const main = (page: Page) => page.locator('main[data-phase]')

/** Fails the test on any console error or uncaught exception (hydration mismatches log as errors). */
export function collectErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`)
  })
  return errors
}

export async function gotoProjects(page: Page, locale: 'en' | 'fa', slug?: string) {
  // Most feature tests are unrelated to the first-visit choreography. Skip it so
  // the cover cannot intentionally delay scrolling/input; its own spec tests it.
  await page.addInitScript(() => sessionStorage.setItem('ravino:splash-seen', '1'))
  await page.goto(`/${locale}/projects${slug ? `/${slug}` : ''}`, { waitUntil: 'networkidle' })
  await expect(main(page)).toHaveAttribute('data-phase', slug ? 'active' : 'overview')
}

export async function settle(page: Page, phase: 'active' | 'overview' = 'active') {
  await expect(main(page)).toHaveAttribute('data-phase', phase, { timeout: 8000 })
}

export async function clickHero(page: Page, slug: string) {
  const l = heroLink(page, slug)
  await l.scrollIntoViewIfNeeded()
  const box = (await l.locator('span').first().boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

/** Logical (direction-agnostic) horizontal position of a strip: 0 at its start. */
export async function logicalScroll(strip: Locator): Promise<number> {
  return strip.evaluate((el) => Math.abs(el.scrollLeft))
}
export async function maxScroll(strip: Locator): Promise<number> {
  return strip.evaluate((el) => el.scrollWidth - el.clientWidth)
}

export interface Sample {
  t: number
  x: number
  y: number
  w: number
  h: number
  scrollY: number
  imgOpacity: number
  imgLoaded: boolean
  phase: string
}

/** Records the hero's rect on every animation frame until stopped. */
export async function startSampling(page: Page, slug: string) {
  await page.evaluate((s) => {
    const w = window as unknown as { __samples: unknown[]; __sampling: boolean }
    const box = document.querySelector(`[data-row="${s}"] [data-panel="hero"] > span`) as HTMLElement
    const img = box.querySelector('img') as HTMLImageElement
    const main = document.querySelector('main[data-phase]') as HTMLElement
    w.__samples = []
    w.__sampling = true
    const loop = () => {
      const r = box.getBoundingClientRect()
      w.__samples.push({
        t: performance.now(),
        x: r.x,
        y: r.y,
        w: r.width,
        h: r.height,
        scrollY: window.scrollY,
        imgOpacity: parseFloat(getComputedStyle(img).opacity),
        imgLoaded: img.complete && img.naturalWidth > 0,
        phase: main.dataset.phase,
      })
      if (w.__sampling) requestAnimationFrame(loop)
    }
    loop()
  }, slug)
}

export async function stopSampling(page: Page): Promise<Sample[]> {
  return page.evaluate(() => {
    const w = window as unknown as { __samples: Sample[]; __sampling: boolean }
    w.__sampling = false
    return w.__samples
  })
}

/** Tags the hero <img> so a test can later prove it is the very same DOM node. */
export async function tagHeroImage(page: Page, slug: string, tag: string) {
  await page.evaluate(
    ([s, t]) => {
      ;(document.querySelector(`[data-row="${s}"] [data-panel="hero"] img`) as HTMLElement & { __tag?: string }).__tag = t
    },
    [slug, tag],
  )
}
export async function heroImageTag(page: Page, slug: string): Promise<string | undefined> {
  return page.evaluate((s) => (document.querySelector(`[data-row="${s}"] [data-panel="hero"] img`) as HTMLElement & { __tag?: string }).__tag, slug)
}
