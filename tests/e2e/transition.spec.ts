import { expect, test } from '@playwright/test'
import {
  clickHero,
  collectErrors,
  gotoProjects,
  heroImageTag,
  heroLink,
  main,
  row,
  settle,
  startSampling,
  stopSampling,
  tagHeroImage,
} from './helpers'

for (const locale of ['en', 'fa'] as const) {
  test.describe(`project open/close transition (${locale})`, () => {
    test('zoom is continuous: no jumps, no blank frames, same image node', async ({ page }) => {
      const errors = collectErrors(page)
      await gotoProjects(page, locale)
      const slug = 'tehran-terraces'
      await tagHeroImage(page, slug, 'same-node')
      await heroLink(page, slug).scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)

      await startSampling(page, slug)
      await clickHero(page, slug)
      await settle(page, 'active')
      await page.waitForTimeout(250)
      const samples = await stopSampling(page)

      // The picture is the same DOM element before, during and after.
      expect(await heroImageTag(page, slug)).toBe('same-node')

      const moving = samples.filter((s) => s.phase === 'entering')
      expect(moving.length).toBeGreaterThan(15) // a real animation, not a jump cut

      // Never collapses or goes blank.
      for (const s of samples) {
        expect(s.w).toBeGreaterThan(100)
        expect(s.h).toBeGreaterThan(100)
        expect(s.imgOpacity).toBe(1)
        expect(s.imgLoaded).toBe(true)
      }
      // Grows monotonically (small tolerance for sub-pixel rounding).
      for (let i = 1; i < samples.length; i++) expect(samples[i].h).toBeGreaterThanOrEqual(samples[i - 1].h - 0.6)
      // Smooth: speed is bounded, so a stalled frame is not mistaken for a jump, but an
      // instantaneous snap would be. power3.inOut peaks at ~4x its mean speed
      // (growth / duration); the limit leaves 2x headroom for scheduler jitter, while a jump
      // cut (the whole growth in one frame, ~11 px/ms here) would exceed it several times over.
      const growth = samples.at(-1)!.h - samples[0].h
      expect(growth).toBeGreaterThan(120)
      const maxSpeed = (growth / 1000) * 8 // px per ms (peak of the eased tween is ~4x the mean)
      for (let i = 1; i < samples.length; i++) {
        const dt = samples[i].t - samples[i - 1].t
        expect(Math.abs(samples[i].h - samples[i - 1].h)).toBeLessThan(maxSpeed * dt + 2)
        // Position: an absolute per-frame cap (the page glides ~160px in total; a jump cut would
        // move it all at once). Not dt-scaled: two samples can land in one frame.
        expect(Math.abs(samples[i].y - samples[i - 1].y)).toBeLessThan(45)
        expect(Math.abs(samples[i].x - samples[i - 1].x)).toBeLessThan(45)
      }
      // Lands fully inside the viewport.
      const last = samples.at(-1)!
      expect(last.y).toBeGreaterThan(40)
      expect(last.y + last.h).toBeLessThan(page.viewportSize()!.height)
      expect(errors).toEqual([])
    })

    test('content appears after the geometry, in order', async ({ page }) => {
      await gotoProjects(page, locale)
      const slug = 'caspian-reading-house'
      await heroLink(page, slug).scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)
      await page.evaluate((s) => {
        const w = window as unknown as { __log: { t: number; p: number; metaOpacity: number; panelOpacity: number }[]; __on: boolean }
        w.__log = []
        w.__on = true
        const r = document.querySelector(`[data-row="${s}"]`) as HTMLElement
        const loop = () => {
          const meta = r.querySelector('[data-reveal="meta"]') as HTMLElement | null
          const panel = r.querySelector('[data-reveal="panel"]') as HTMLElement | null
          w.__log.push({
            t: performance.now(),
            p: parseFloat(r.style.getPropertyValue('--p') || '0'),
            metaOpacity: meta ? parseFloat(getComputedStyle(meta).opacity) : -1,
            panelOpacity: panel ? parseFloat(getComputedStyle(panel).opacity) : -1,
          })
          if (w.__on) requestAnimationFrame(loop)
        }
        loop()
      }, slug)
      await clickHero(page, slug)
      await settle(page, 'active')
      const log = await page.evaluate(() => {
        const w = window as unknown as { __log: { t: number; p: number; metaOpacity: number; panelOpacity: number }[]; __on: boolean }
        w.__on = false
        return w.__log
      })
      // No text is visible while the image has barely started to grow.
      for (const e of log) {
        if (e.p < 0.3) {
          expect(e.metaOpacity).toBeLessThan(0.05)
          expect(e.panelOpacity).toBeLessThan(0.05)
        }
      }
      // ...and everything ends up fully visible.
      const end = log.at(-1)!
      expect(end.metaOpacity).toBe(1)
      expect(end.panelOpacity).toBe(1)
    })

    test('Escape closes and restores the overview position', async ({ page }) => {
      await gotoProjects(page, locale)
      const slug = 'zagros-lodge'
      await heroLink(page, slug).scrollIntoViewIfNeeded()
      await page.waitForTimeout(400)
      const before = await heroLink(page, slug).locator('span').first().boundingBox()
      const yBefore = await page.evaluate(() => window.scrollY)

      await clickHero(page, slug)
      await settle(page, 'active')
      await expect(page).toHaveURL(new RegExp(`/${locale}/projects/${slug}$`))
      await page.keyboard.press('Escape')
      await settle(page, 'overview')
      await expect(page).toHaveURL(new RegExp(`/${locale}/projects$`))

      const after = await heroLink(page, slug).locator('span').first().boundingBox()
      expect(Math.abs(after!.y - before!.y)).toBeLessThan(6)
      expect(Math.abs(after!.height - before!.height)).toBeLessThan(2)
      expect(Math.abs((await page.evaluate(() => window.scrollY)) - yBefore)).toBeLessThan(6)
      // Strip content is unmounted again once closed.
      await expect(page.locator('[data-reveal]')).toHaveCount(0)
    })

    test('close button, Back and Forward all reconcile with the URL', async ({ page }) => {
      const errors = collectErrors(page)
      await gotoProjects(page, locale)
      const slug = 'hormuz-shore-walk'
      await clickHero(page, slug)
      await settle(page, 'active')

      await page.goBack()
      await settle(page, 'overview')
      await expect(page).toHaveURL(new RegExp(`/${locale}/projects$`))
      await expect(row(page, slug)).toHaveAttribute('data-open', 'false')

      await page.goForward()
      await settle(page, 'active')
      await expect(page).toHaveURL(new RegExp(`/${locale}/projects/${slug}$`))
      await expect(row(page, slug)).toHaveAttribute('data-open', 'true')

      await page.getByRole('button', { name: /Close project|بستن پروژه/ }).click()
      await settle(page, 'overview')
      await expect(page).toHaveURL(new RegExp(`/${locale}/projects$`))
      expect(errors).toEqual([])
    })

    test('repeated and conflicting clicks never overlap transitions', async ({ page }) => {
      const errors = collectErrors(page)
      await gotoProjects(page, locale)
      const a = 'tehran-terraces'
      const b = 'caspian-reading-house'
      const historyBefore = await page.evaluate(() => history.length)
      await heroLink(page, a).scrollIntoViewIfNeeded()
      await page.waitForTimeout(300)
      const box = (await heroLink(page, a).locator('span').first().boundingBox())!
      // Hammer the same image, then click another while the first is still opening.
      for (let i = 0; i < 4; i++) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
      await page.waitForTimeout(150)
      await heroLink(page, b).dispatchEvent('click')
      await settle(page, 'active')
      await page.waitForTimeout(300)
      // Exactly one project is open, it is the first one clicked, and one history entry was added.
      await expect(page.locator('[data-row][data-open="true"]')).toHaveCount(1)
      await expect(page).toHaveURL(new RegExp(`/${locale}/projects/${a}$`))
      expect(await page.evaluate(() => history.length)).toBe(historyBefore + 1)
      await expect(main(page)).toHaveAttribute('data-active', a)
      expect(errors).toEqual([])
    })

    test('an interrupted transition (Back mid-open) recovers cleanly', async ({ page }) => {
      const errors = collectErrors(page)
      await gotoProjects(page, locale)
      const slug = 'kavir-observatory'
      await clickHero(page, slug)
      await page.waitForTimeout(280) // mid-transition
      await page.goBack()
      await settle(page, 'overview')
      await page.waitForTimeout(300)
      await expect(page.locator('[data-row][data-open="true"]')).toHaveCount(0)
      await expect(page.locator('[data-reveal]')).toHaveCount(0)
      // Every row is back at its closed size.
      const heights = await page.evaluate(() => [...document.querySelectorAll('[data-row]')].map((r) => parseFloat((r as HTMLElement).style.getPropertyValue('--p'))))
      expect(Math.max(...heights)).toBe(0)
      // And it can be opened again right away.
      await clickHero(page, slug)
      await settle(page, 'active')
      expect(errors).toEqual([])
    })

    test('switching directly between projects (related link)', async ({ page }) => {
      await gotoProjects(page, locale, 'meridian-pavilion')
      const strip = page.locator('[data-row="meridian-pavilion"] [data-scroller]')
      await strip.evaluate((el) => (el.scrollLeft = el.scrollLeft * 0 + (el.scrollWidth - el.clientWidth) * (document.dir === 'rtl' ? -1 : 1)))
      const related = page.locator('[data-row="meridian-pavilion"] a[href$="/projects/naqsh-atelier-interior"]')
      await related.click()
      await settle(page, 'active')
      await expect(page).toHaveURL(new RegExp(`/${locale}/projects/naqsh-atelier-interior$`))
      await expect(row(page, 'naqsh-atelier-interior')).toHaveAttribute('data-open', 'true')
      await expect(row(page, 'meridian-pavilion')).toHaveAttribute('data-open', 'false')
      await expect(page.locator('[data-row="meridian-pavilion"] [data-reveal]')).toHaveCount(0)
    })
  })
}
