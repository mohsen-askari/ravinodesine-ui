import { expect, test } from '@playwright/test'
import { SLUGS, collectErrors, gotoProjects, scroller, logicalScroll } from './helpers'

// Content must never be clipped by the row, in either script, at any realistic viewport.
// Persian runs longer than English for the same text (taller line-height), landscape phones
// are very short, and captions sit below full-height images — all have broken this before.
const VIEWPORTS = [
  [1920, 1080],
  [1440, 900],
  [1280, 720],
  [1024, 768],
  [1024, 600],
  [820, 1180],
  [390, 844],
  [360, 640],
  [844, 390], // landscape phone
] as const

for (const [w, h] of VIEWPORTS) {
  test(`no panel is clipped by the strip at ${w}x${h} (both locales, all projects)`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h })
    for (const locale of ['en', 'fa'] as const) {
      for (const slug of SLUGS) {
        await page.goto(`/${locale}/projects/${slug}`, { waitUntil: 'domcontentloaded' })
        await expect(page.locator('main[data-phase="active"]')).toBeVisible()
        const clipped = await page.evaluate(() => {
          const s = document.querySelector('[data-row][data-open="true"] [data-scroller]') as HTMLElement
          const sr = s.getBoundingClientRect()
          let worst = 0
          for (const el of s.querySelectorAll('[data-panel], [data-reveal]')) worst = Math.max(worst, el.getBoundingClientRect().bottom - sr.bottom)
          return Math.round(worst)
        })
        expect(clipped, `${locale}/${slug} @ ${w}x${h}`).toBeLessThanOrEqual(2)
      }
    }
  })
}

test('landscape phone: open project is fully reachable by vertical page scroll and horizontal swipe/keys', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 })
  const errors = collectErrors(page)
  await gotoProjects(page, 'en', 'zagros-lodge')
  const strip = scroller(page, 'zagros-lodge')
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => logicalScroll(strip)).toBeGreaterThan(100)
  // The page can scroll so the whole row (taller than this viewport) can be read.
  const bottom = await strip.evaluate((el) => el.getBoundingClientRect().bottom + window.scrollY)
  await page.evaluate((y) => window.scrollTo(0, y), bottom - 390 + 80)
  await page.waitForTimeout(200)
  expect(await strip.evaluate((el) => el.getBoundingClientRect().bottom)).toBeLessThan(390)
  expect(errors).toEqual([])
})

test('overview never overflows the page horizontally at any viewport', async ({ page }) => {
  for (const [w, h] of VIEWPORTS) {
    await page.setViewportSize({ width: w, height: h })
    for (const locale of ['en', 'fa'] as const) {
      await gotoProjects(page, locale)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${locale} @ ${w}x${h}`).toBe(true)
    }
  }
})
