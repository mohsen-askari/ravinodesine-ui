import { expect, test } from '@playwright/test'
import { collectErrors, gotoProjects, logicalScroll, maxScroll, scroller } from './helpers'

const SLUG = 'meridian-pavilion'

for (const [locale, forward, backward] of [
  ['en', 'ArrowRight', 'ArrowLeft'],
  ['fa', 'ArrowLeft', 'ArrowRight'],
] as const) {
  test.describe(`horizontal exploration (${locale}, ${locale === 'fa' ? 'RTL' : 'LTR'})`, () => {
    test('the strip starts at the inline-start edge and is genuinely scrollable', async ({ page }) => {
      await gotoProjects(page, locale, SLUG)
      const strip = scroller(page, SLUG)
      expect(await logicalScroll(strip)).toBe(0)
      expect(await maxScroll(strip)).toBeGreaterThan(3000) // a long narrative, not a 3-slide carousel
      // The first panel after the hero is peeking at the inline-END side of the viewport.
      const vw = page.viewportSize()!.width
      const panel = (await page.locator(`[data-row="${SLUG}"] [data-panel="summary"]`).boundingBox())!
      if (locale === 'en') expect(panel.x).toBeGreaterThan(vw * 0.6)
      else expect(panel.x + panel.width).toBeLessThan(vw * 0.4)
    })

    test('arrow keys follow the reading direction; the opposite arrow goes back', async ({ page }) => {
      await gotoProjects(page, locale, SLUG)
      const strip = scroller(page, SLUG)
      await page.keyboard.press(forward)
      await expect.poll(() => logicalScroll(strip)).toBeGreaterThan(200)
      const one = await logicalScroll(strip)
      await page.keyboard.press(forward)
      await expect.poll(() => logicalScroll(strip)).toBeGreaterThan(one + 100)
      await page.keyboard.press(backward)
      await page.keyboard.press(backward)
      await expect.poll(() => logicalScroll(strip)).toBeLessThan(5)
      // And the physical scrollLeft sign matches the direction (negative in RTL).
      await page.keyboard.press(forward)
      await expect.poll(() => strip.evaluate((el, fa) => (fa ? el.scrollLeft < -100 : el.scrollLeft > 100), locale === 'fa')).toBe(true)
    })

    test('previous/next buttons, counter and progress follow the same semantics', async ({ page }) => {
      await gotoProjects(page, locale, SLUG)
      const next = page.getByRole('button', { name: /Next panel|بخش بعدی/ })
      const prev = page.getByRole('button', { name: /Previous panel|بخش قبلی/ })
      await expect(prev).toBeDisabled()
      const counter = page.locator('[data-controls] [aria-live="off"]')
      const text0 = await counter.textContent()
      await next.click()
      await page.waitForTimeout(1000)
      await expect(prev).toBeEnabled()
      expect(await counter.textContent()).not.toBe(text0)
      const prog = await page.locator('[data-controls]').evaluate((el) => parseFloat(el.style.getPropertyValue('--prog')))
      expect(prog).toBeGreaterThan(0)
      // The "next" arrow points along the reading direction: its glyph is mirrored in RTL.
      const matrix = await next.locator('svg').evaluate((el) => getComputedStyle(el).transform)
      expect(matrix).toBe(locale === 'fa' ? 'matrix(-1, 0, 0, 1, 0, 0)' : 'matrix(1, 0, 0, 1, 0, 0)')
      // Walk to the end with the button; it disables there (no dead end, no overshoot).
      for (let i = 0; i < 20 && !(await next.isDisabled()); i++) {
        await next.click()
        await page.waitForTimeout(450)
      }
      await expect(next).toBeDisabled()
      const strip = scroller(page, SLUG)
      expect(await logicalScroll(strip)).toBeGreaterThan((await maxScroll(strip)) - 3)
    })

    test('mouse wheel over the strip moves it horizontally in reading direction', async ({ page }) => {
      await gotoProjects(page, locale, SLUG)
      const strip = scroller(page, SLUG)
      const yBefore = await page.evaluate(() => window.scrollY)
      await page.mouse.move(720, 450)
      await page.mouse.wheel(0, 300)
      await page.waitForTimeout(700)
      expect(await logicalScroll(strip)).toBeGreaterThan(200)
      expect(await strip.evaluate((el) => Math.sign(el.scrollLeft))).toBe(locale === 'fa' ? -1 : 1)
      expect(await page.evaluate(() => window.scrollY)).toBe(yBefore) // the page itself did not scroll
    })

    test('wheel falls through to the page at the strip edges (no dead end)', async ({ page }) => {
      // A project that is not first, so the page can scroll in both directions.
      const slug = 'zagros-lodge'
      await gotoProjects(page, locale, slug)
      const strip = scroller(page, slug)
      await page.mouse.move(720, 450)
      // At the start, wheel-up must scroll the page, not be swallowed.
      const y0 = await page.evaluate(() => window.scrollY)
      await page.mouse.wheel(0, -200)
      await page.waitForTimeout(400)
      expect(await page.evaluate(() => window.scrollY)).toBeLessThan(y0)
      // Jump to the end; wheel-down must now scroll the page.
      await strip.evaluate((el) => (el.scrollLeft = (el.scrollWidth - el.clientWidth) * (document.dir === 'rtl' ? -1 : 1)))
      await page.waitForTimeout(200)
      const y1 = await page.evaluate(() => window.scrollY)
      await page.mouse.move(720, 450)
      await page.mouse.wheel(0, 300)
      await page.waitForTimeout(500)
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(y1)
    })

    test('wheel over the page gutter (outside the strip) scrolls the page vertically', async ({ page }) => {
      await gotoProjects(page, locale)
      const y0 = await page.evaluate(() => window.scrollY)
      await page.mouse.move(720, 450)
      await page.mouse.wheel(0, 400)
      await page.waitForTimeout(500)
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(y0 + 200)
    })

    test('trackpad-style deltas are left to the browser (no hijack)', async ({ page }) => {
      await gotoProjects(page, locale, SLUG)
      const prevented = await page.evaluate(async () => {
        const el = document.querySelector('[data-row][data-open="true"] [data-scroller]')!
        const e = new WheelEvent('wheel', { deltaY: 7, deltaX: 0, deltaMode: 0, bubbles: true, cancelable: true })
        el.dispatchEvent(e)
        const e2 = new WheelEvent('wheel', { deltaY: 3.5, deltaX: 0, deltaMode: 0, bubbles: true, cancelable: true })
        el.dispatchEvent(e2)
        return [e.defaultPrevented, e2.defaultPrevented]
      })
      expect(prevented).toEqual([false, false])
    })

    test('Home and End jump the strip when it has focus', async ({ page }) => {
      await gotoProjects(page, locale, SLUG)
      const strip = scroller(page, SLUG)
      await strip.focus()
      await page.keyboard.press('End')
      await expect.poll(async () => (await maxScroll(strip)) - (await logicalScroll(strip))).toBeLessThan(3)
      await page.keyboard.press('Home')
      await expect.poll(() => logicalScroll(strip)).toBeLessThan(3)
    })

    test('mouse drag scrolls the strip in the same direction as the content moves', async ({ page }) => {
      await gotoProjects(page, locale, SLUG)
      const strip = scroller(page, SLUG)
      const y = 560
      // Dragging toward the inline-start moves forward through the story.
      const [from, to] = locale === 'en' ? [1000, 600] : [440, 840]
      await page.mouse.move(from, y)
      await page.mouse.down()
      await page.mouse.move(to, y, { steps: 12 })
      await page.mouse.up()
      expect(await logicalScroll(strip)).toBeGreaterThan(300)
      expect(await page.evaluate(() => location.pathname)).toContain(SLUG) // the drag did not trigger a click
    })

    test('the strip scrolls natively too (trackpad deltaX / scrollbar / focus)', async ({ page }) => {
      await gotoProjects(page, locale, SLUG)
      const strip = scroller(page, SLUG)
      await page.mouse.move(720, 450)
      // Forward is toward the left in RTL, so a native horizontal wheel needs the opposite sign.
      await page.mouse.wheel(locale === 'fa' ? -500 : 500, 0)
      await page.waitForTimeout(600)
      expect(await logicalScroll(strip)).toBeGreaterThan(200)
      expect(await strip.evaluate((el) => Math.sign(el.scrollLeft))).toBe(locale === 'fa' ? -1 : 1)
    })

    test('no console errors while exploring', async ({ page }) => {
      const errors = collectErrors(page)
      await gotoProjects(page, locale, SLUG)
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press(forward)
        await page.waitForTimeout(250)
      }
      expect(errors).toEqual([])
    })
  })
}
