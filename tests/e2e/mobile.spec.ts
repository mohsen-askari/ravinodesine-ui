import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { collectErrors, gotoProjects, heroLink, logicalScroll, row, scroller, settle } from './helpers'

// Pixel 7 emulation: touch, 412px wide. Touch input uses native overflow scrolling, so these
// tests drive real touch events through CDP. (Input.synthesizeScrollGesture is a no-op in this
// headless setup even on a trivial page, so gestures are built from raw touch events, which
// Chromium turns into genuine compositor scroll gestures.)

async function swipe(page: Page, x1: number, y1: number, x2: number, y2: number) {
  const cdp = await page.context().newCDPSession(page)
  const steps = 14
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x1, y: y1 }] })
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x1 + ((x2 - x1) * i) / steps, y: y1 + ((y2 - y1) * i) / steps }] })
    await page.waitForTimeout(12)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForTimeout(600)
}

for (const locale of ['en', 'fa'] as const) {
  test.describe(`mobile (${locale})`, () => {
    test('overview is a vertical stack with captions below the images', async ({ page }) => {
      const errors = collectErrors(page)
      await gotoProjects(page, locale)
      const vw = page.viewportSize()!.width
      const hero = (await heroLink(page, 'meridian-pavilion').locator('span').first().boundingBox())!
      expect(hero.width).toBeGreaterThan(vw * 0.85)
      const title = (await row(page, 'meridian-pavilion').locator('h2').boundingBox())!
      expect(title.y).toBeGreaterThan(hero.y + hero.height - 2) // caption is below, not beside
      // No horizontal page overflow.
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
      expect(errors).toEqual([])
    })

    test('tap opens a project; swiping moves through the story in reading direction', async ({ page }) => {
      await gotoProjects(page, locale)
      const slug = 'caspian-reading-house'
      await heroLink(page, slug).scrollIntoViewIfNeeded()
      await heroLink(page, slug).locator('span').first().tap()
      await settle(page, 'active')
      await expect(page).toHaveURL(new RegExp(`/${locale}/projects/${slug}$`))

      const strip = scroller(page, slug)
      const box = (await strip.boundingBox())!
      const y = box.y + box.height / 2
      const vw = page.viewportSize()!.width
      expect(await logicalScroll(strip)).toBe(0)
      // Swipe toward the inline-start edge = forward through the story.
      if (locale === 'en') await swipe(page, vw * 0.8, y, vw * 0.2, y)
      else await swipe(page, vw * 0.2, y, vw * 0.8, y)
      expect(await logicalScroll(strip)).toBeGreaterThan(150)
      expect(await strip.evaluate((el) => Math.sign(el.scrollLeft))).toBe(locale === 'fa' ? -1 : 1)
      // And back.
      if (locale === 'en') await swipe(page, vw * 0.2, y, vw * 0.8, y)
      else await swipe(page, vw * 0.8, y, vw * 0.2, y)
      // Native touch momentum varies slightly across Chromium builds. Returning
      // within one fifth of the viewport still proves the reverse reading gesture.
      expect(await logicalScroll(strip)).toBeLessThan(vw * 0.2)
    })

    test('vertical swipes on an open strip still scroll the page', async ({ page }) => {
      await gotoProjects(page, locale, 'tehran-terraces')
      const strip = scroller(page, 'tehran-terraces')
      const box = (await strip.boundingBox())!
      const y0 = await page.evaluate(() => window.scrollY)
      await swipe(page, 200, box.y + box.height / 2, 200, box.y + box.height / 2 - 300)
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(y0 + 100)
    })

    test('controls are touch-sized and the close button exits', async ({ page }) => {
      await gotoProjects(page, locale, 'tehran-terraces')
      for (const name of [/Next panel|بخش بعدی/, /Previous panel|بخش قبلی/, /Close project|بستن پروژه/]) {
        const b = (await page.getByRole('button', { name }).boundingBox())!
        expect(b.height).toBeGreaterThanOrEqual(44)
      }
      await page.getByRole('button', { name: /Close project|بستن پروژه/ }).tap()
      await settle(page, 'overview')
    })

    test('direct URL works on mobile and the open row fits the viewport', async ({ page }) => {
      await gotoProjects(page, locale, 'zagros-lodge')
      const hero = (await heroLink(page, 'zagros-lodge').locator('span').first().boundingBox())!
      const vp = page.viewportSize()!
      expect(hero.y).toBeGreaterThan(0)
      expect(hero.y + hero.height).toBeLessThan(vp.height)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    })
  })
}
