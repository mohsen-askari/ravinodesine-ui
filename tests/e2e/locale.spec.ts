import { expect, test } from '@playwright/test'
import { clickHero, collectErrors, gotoProjects, heroLink, settle, row } from './helpers'

test.describe('locale, direction and document attributes', () => {
  test('English is LTR, Persian is RTL (document level)', async ({ page }) => {
    const errors = collectErrors(page)
    await gotoProjects(page, 'en')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
    expect(await page.evaluate(() => getComputedStyle(document.body).direction)).toBe('ltr')

    await gotoProjects(page, 'fa')
    await expect(page.locator('html')).toHaveAttribute('lang', 'fa')
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    expect(await page.evaluate(() => getComputedStyle(document.body).direction)).toBe('rtl')
    expect(errors).toEqual([])
  })

  test('root redirects by Accept-Language', async ({ browser }) => {
    for (const [locale, expected] of [
      ['fa-IR', '/fa/projects'],
      ['en-US', '/en/projects'],
      ['de-DE', '/en/projects'], // unsupported -> default
    ] as const) {
      // Chromium derives the Accept-Language header from the context locale.
      const ctx = await browser.newContext({ locale })
      const page = await ctx.newPage()
      await page.goto('/')
      expect(new URL(page.url()).pathname).toBe(expected)
      await ctx.close()
    }
  })

  test('navigation, captions and metadata mirror between locales', async ({ page }) => {
    await gotoProjects(page, 'en')
    const vw = page.viewportSize()!.width
    const wordmarkEn = (await page.locator('header a[aria-label]').first().boundingBox())!
    expect(wordmarkEn.x + wordmarkEn.width / 2).toBeLessThan(vw / 2) // inline-start = left

    const heroEn = (await heroLink(page, 'meridian-pavilion').locator('span').first().boundingBox())!
    const titleEn = (await row(page, 'meridian-pavilion').locator('h2').boundingBox())!
    expect(titleEn.x + titleEn.width).toBeLessThan(heroEn.x) // caption sits before the image
    expect(await row(page, 'meridian-pavilion').locator('h2').evaluate((el) => getComputedStyle(el).textAlign)).toMatch(/end|right/)

    await gotoProjects(page, 'fa')
    const wordmarkFa = (await page.locator('header a[aria-label]').first().boundingBox())!
    expect(wordmarkFa.x + wordmarkFa.width / 2).toBeGreaterThan(vw / 2) // inline-start = right

    const heroFa = (await heroLink(page, 'meridian-pavilion').locator('span').first().boundingBox())!
    const titleFa = (await row(page, 'meridian-pavilion').locator('h2').boundingBox())!
    expect(titleFa.x).toBeGreaterThan(heroFa.x + heroFa.width) // caption now to the right of the image
  })

  test('direct project URLs open the project in both locales', async ({ page }) => {
    const errors = collectErrors(page)
    for (const locale of ['en', 'fa'] as const) {
      await gotoProjects(page, locale, 'zagros-lodge')
      await expect(row(page, 'zagros-lodge')).toHaveAttribute('data-open', 'true')
      await expect(page.locator('[data-row="zagros-lodge"] [data-panel]')).not.toHaveCount(1)
      const hero = (await heroLink(page, 'zagros-lodge').locator('span').first().boundingBox())!
      expect(hero.height).toBeGreaterThan(450) // open, not the ~300px overview size
      // The open project sits inside the viewport on load, not off-screen.
      expect(hero.y).toBeGreaterThan(0)
      expect(hero.y + hero.height).toBeLessThan(page.viewportSize()!.height)
      await expect(page).toHaveTitle(locale === 'fa' ? /اقامتگاه زاگرس/ : /Zagros Lodge/)
    }
    expect(errors).toEqual([])
  })

  test('unknown slug and unknown locale give a 404', async ({ page }) => {
    expect((await page.goto('/en/projects/not-a-project'))!.status()).toBe(404)
    expect((await page.goto('/xx/projects'))!.status()).toBe(404)
  })

  test('mixed Persian/English content is isolated and keeps its order', async ({ page }) => {
    await gotoProjects(page, 'fa', 'meridian-pavilion')
    // Latin fragments inside Persian prose are wrapped in LTR isolates.
    const isolated = await page.locator('[data-row="meridian-pavilion"] bdi[dir="ltr"]').allTextContents()
    expect(isolated).toContain('Atelier Nord')
    expect(isolated.some((s) => s.includes('LEED Gold'))).toBe(true)
    // Letter-spacing must be zero in Persian (it breaks letter joining).
    const spacing = await page.locator('h2').first().evaluate((el) => getComputedStyle(el).letterSpacing)
    expect(['normal', '0px']).toContain(spacing)
    // Years use the Solar Hijri calendar with Persian digits.
    await expect(page.locator('[data-row="meridian-pavilion"] dd', { hasText: '۱۴۰۴' })).toBeVisible()
    // The e-mail address in the footer stays left-to-right.
    const email = page.locator('footer a[href^="mailto:"] bdi')
    await expect(email).toHaveAttribute('dir', 'ltr')
    await expect(email).toHaveText('hello@ravino.studio')
  })

  test('language switch keeps the project, direction and reading position', async ({ page }) => {
    const errors = collectErrors(page)
    await gotoProjects(page, 'en', 'tehran-terraces')
    const strip = page.locator('[data-row="tehran-terraces"] [data-scroller]')
    // Move well into the strip, and note the position as a fraction.
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(1400)
    const fraction = async () => strip.evaluate((el) => Math.abs(el.scrollLeft) / (el.scrollWidth - el.clientWidth))
    const before = await fraction()
    expect(before).toBeGreaterThan(0.1)
    const scrollYBefore = await page.evaluate(() => window.scrollY)

    await page.getByRole('link', { name: /فارسی/ }).click()
    await expect(page).toHaveURL(/\/fa\/projects\/tehran-terraces$/)
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.locator('html')).toHaveAttribute('lang', 'fa')
    await expect(row(page, 'tehran-terraces')).toHaveAttribute('data-open', 'true')
    await page.waitForTimeout(500)
    const after = await page.locator('[data-row="tehran-terraces"] [data-scroller]').evaluate((el) => Math.abs(el.scrollLeft) / (el.scrollWidth - el.clientWidth))
    expect(Math.abs(after - before)).toBeLessThan(0.06)
    const scrollYAfter = await page.evaluate(() => window.scrollY)
    expect(Math.abs(scrollYAfter - scrollYBefore)).toBeLessThan(40)

    // And back again; history keeps both entries, no full reload needed.
    await page.getByRole('link', { name: /English/ }).click()
    await expect(page).toHaveURL(/\/en\/projects\/tehran-terraces$/)
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
    expect(errors).toEqual([])
  })

  test('language switch does not reload the document', async ({ page }) => {
    await gotoProjects(page, 'en')
    await page.evaluate(() => ((window as unknown as { __alive: boolean }).__alive = true))
    await page.getByRole('link', { name: /فارسی/ }).click()
    await expect(page).toHaveURL(/\/fa\/projects$/)
    await settle(page, 'overview')
    expect(await page.evaluate(() => (window as unknown as { __alive?: boolean }).__alive)).toBe(true)
  })
})

test.describe('typography, history and RTL storytelling details', () => {
  test('each locale loads its own typeface (not a system fallback)', async ({ page }) => {
    for (const [locale, family] of [
      ['en', 'Hanken Grotesk Variable'],
      ['fa', 'Vazirmatn Variable'],
    ] as const) {
      await gotoProjects(page, locale)
      const stack = await page.evaluate(() => getComputedStyle(document.body).fontFamily)
      expect(stack.startsWith(`"${family}"`) || stack.startsWith(family)).toBe(true)
      // The font file for the text actually in use is loaded.
      const loaded = await page.evaluate(async (f) => {
        await document.fonts.ready
        return [...document.fonts].some((x) => x.family.replace(/"/g, '') === f && x.status === 'loaded')
      }, family)
      expect(loaded, `${family} should be loaded for /${locale}`).toBe(true)
    }
  })

  test('Back after a language switch returns to the previous language and project', async ({ page }) => {
    await gotoProjects(page, 'en', 'zagros-lodge')
    await page.getByRole('link', { name: /فارسی/ }).click()
    await expect(page).toHaveURL(/\/fa\/projects\/zagros-lodge$/)
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await page.goBack()
    await expect(page).toHaveURL(/\/en\/projects\/zagros-lodge$/)
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
    await expect(row(page, 'zagros-lodge')).toHaveAttribute('data-open', 'true')
    await page.goForward()
    await expect(page).toHaveURL(/\/fa\/projects\/zagros-lodge$/)
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })

  test('the progress bar grows from the strip start: left in LTR, right in RTL', async ({ page }) => {
    for (const [locale, origin] of [
      ['en', 'left'],
      ['fa', 'right'],
    ] as const) {
      await gotoProjects(page, locale, 'zagros-lodge')
      const o = await page.locator('[data-controls] div[class*="bar"]').evaluate((el) => getComputedStyle(el).transformOrigin)
      const [x] = o.split(' ')
      // offsetWidth ignores the scaleX transform (the bar is scaled to 0 at progress 0).
      const w = await page.locator('[data-controls] div[class*="bar"]').evaluate((el) => (el as HTMLElement).offsetWidth)
      expect(parseFloat(x), `${locale} origin ${o}`).toBeCloseTo(origin === 'left' ? 0 : w, 0)
    }
  })

  test('content is revealed entering from the inline-end side (right in LTR, left in RTL)', async ({ page }) => {
    for (const [locale, sign] of [
      ['en', 1],
      ['fa', -1],
    ] as const) {
      await gotoProjects(page, locale)
      const slug = 'tehran-terraces'
      await heroLink(page, slug).scrollIntoViewIfNeeded()
      await page.waitForTimeout(250)
      await page.evaluate((s) => {
        const w = window as unknown as { __tx: number[]; __on: boolean }
        w.__tx = []
        w.__on = true
        const loop = () => {
          const el = document.querySelector(`[data-row="${s}"] [data-reveal="panel"]`) as HTMLElement | null
          if (el) {
            const m = getComputedStyle(el).transform
            if (m !== 'none') w.__tx.push(new DOMMatrix(m).m41)
          }
          if (w.__on) requestAnimationFrame(loop)
        }
        loop()
      }, slug)
      await clickHero(page, slug)
      await settle(page, 'active')
      const tx = await page.evaluate(() => {
        const w = window as unknown as { __tx: number[]; __on: boolean }
        w.__on = false
        return w.__tx
      })
      expect(tx.length).toBeGreaterThan(3)
      // The first revealed frames are offset toward inline-end, then settle at 0.
      const extreme = tx.reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a), 0)
      expect(Math.sign(extreme), `${locale} reveal offset ${extreme}`).toBe(sign)
    }
  })
})
