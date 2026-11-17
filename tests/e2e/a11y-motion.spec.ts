import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { clickHero, gotoProjects, heroLink, logicalScroll, scroller, settle, startSampling, stopSampling } from './helpers'

for (const locale of ['en', 'fa'] as const) {
  test.describe(`accessibility (${locale})`, () => {
    test('overview and open project have no axe violations', async ({ page }) => {
      await gotoProjects(page, locale)
      const overview = await new AxeBuilder({ page }).analyze()
      expect(overview.violations.map((v) => `${v.id}: ${v.nodes[0]?.html}`)).toEqual([])

      await gotoProjects(page, locale, 'tehran-terraces')
      const open = await new AxeBuilder({ page }).analyze()
      expect(open.violations.map((v) => `${v.id}: ${v.nodes[0]?.html}`)).toEqual([])
    })

    test('everything is keyboard operable: open with Enter, move, close with Escape', async ({ page }) => {
      await gotoProjects(page, locale)
      await heroLink(page, 'zagros-lodge').focus()
      await page.keyboard.press('Enter')
      await settle(page, 'active')
      await expect(page).toHaveURL(new RegExp(`/${locale}/projects/zagros-lodge$`))
      await page.keyboard.press(locale === 'fa' ? 'ArrowLeft' : 'ArrowRight')
      await expect.poll(() => logicalScroll(scroller(page, 'zagros-lodge'))).toBeGreaterThan(100)
      await page.keyboard.press('Escape')
      await settle(page, 'overview')
      // Focus returns to the project that was closed, never lost to <body>.
      await expect(heroLink(page, 'zagros-lodge')).toBeFocused()
    })

    test('keyboard focus on a project image is clearly visible (ring is painted over the picture)', async ({ page }) => {
      await gotoProjects(page, locale)
      for (let i = 0; i < 15; i++) {
        await page.keyboard.press('Tab')
        if (await heroLink(page, 'meridian-pavilion').evaluate((el) => el === document.activeElement)) break
      }
      await expect(heroLink(page, 'meridian-pavilion')).toBeFocused()
      const ring = await heroLink(page, 'meridian-pavilion').locator('span').first().evaluate((el) => getComputedStyle(el, '::after').boxShadow)
      expect(ring).not.toBe('none')
      expect(ring).toContain('inset')
    })

    test('the page stays readable by assistive tech while a project is open (nothing inert/hidden)', async ({ page }) => {
      await gotoProjects(page, locale, 'tehran-terraces')
      expect(await page.locator('[inert], [aria-hidden="true"]:not(svg):not([class*="badge"]):not([class*="backdrop"]):not([class*="rule"])').count()).toBe(0)
      await expect(page.locator('main')).toHaveAttribute('aria-busy', 'false')
      await expect(page.getByRole('region', { name: /project story|روایت پروژه/ })).toBeVisible()
      // Reading order in the DOM is the story order, independent of direction.
      const types = await page.locator('[data-row="tehran-terraces"] [data-panel]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.panel))
      expect(types[0]).toBe('hero')
      expect(types[1]).toBe('summary')
      expect(types.at(-1)).toBe('related')
    })
  })
}

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })
  for (const locale of ['en', 'fa'] as const) {
    test(`replaces the zoom with a short cross-fade and keeps all content (${locale})`, async ({ page }) => {
      await gotoProjects(page, locale)
      const slug = 'tehran-terraces'
      await heroLink(page, slug).scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)
      await startSampling(page, slug)
      const t0 = Date.now()
      await clickHero(page, slug)
      await settle(page, 'active')
      const elapsed = Date.now() - t0
      const samples = await stopSampling(page)
      expect(elapsed).toBeLessThan(900)
      // No travelling zoom: the box jumps (at most a couple of frames), it is not tweened.
      const intermediate = samples.filter((s) => s.h > samples[0].h + 5 && s.h < samples.at(-1)!.h - 5)
      expect(intermediate.length).toBeLessThanOrEqual(2)
      await page.waitForTimeout(300)
      const opacities = await page.locator('[data-row="tehran-terraces"] [data-reveal]').evaluateAll((els) => els.map((e) => getComputedStyle(e).opacity))
      expect(opacities.length).toBeGreaterThan(5)
      expect(opacities.every((o) => o === '1')).toBe(true)
      // Navigation still works.
      await page.keyboard.press(locale === 'fa' ? 'ArrowLeft' : 'ArrowRight')
      await expect.poll(() => logicalScroll(scroller(page, slug))).toBeGreaterThan(100)
      await page.keyboard.press('Escape')
      await settle(page, 'overview')
    })
  }

  test('the overview zoom-while-scrolling is disabled', async ({ page }) => {
    await gotoProjects(page, 'en')
    await page.mouse.move(720, 450)
    for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 700)
    await page.waitForTimeout(100)
    expect(await page.locator('ol').first().evaluate((el) => (el as HTMLElement).style.transform)).toBe('')
  })
})

test('overview zoom-out reacts to fast scrolling and settles back (motion enabled)', async ({ page }) => {
  await gotoProjects(page, 'en')
  await page.mouse.move(720, 450)
  let min = 1
  for (let i = 0; i < 8; i++) {
    await page.mouse.wheel(0, 900)
    await page.waitForTimeout(40)
    const s = await page.locator('ol').first().evaluate((el) => {
      const m = (el as HTMLElement).style.transform.match(/scale\(([\d.]+)\)/)
      return m ? parseFloat(m[1]) : 1
    })
    min = Math.min(min, s)
  }
  expect(min).toBeLessThan(0.97)
  expect(min).toBeGreaterThan(0.8)
  await page.waitForTimeout(1500)
  expect(await page.locator('ol').first().evaluate((el) => (el as HTMLElement).style.transform)).toBe('')
})
