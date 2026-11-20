import { expect, test } from '@playwright/test'

for (const locale of ['en', 'fa'] as const) {
  test(`brand morph and menu stay on the ${locale} inline-start side`, async ({ page }) => {
    await page.goto(`/${locale}/projects`, { waitUntil: 'networkidle' })
    await expect(page.locator('[data-splash-screen]')).toHaveCount(0, { timeout: 5000 })

    const trigger = page.locator('[data-menu-trigger]')
    const wordmark = trigger.locator('[data-wordmark]')
    const icon = trigger.locator('svg')
    await trigger.hover()
    await expect.poll(() => wordmark.evaluate((el) => Number(getComputedStyle(el).opacity))).toBeLessThan(0.1)
    await expect.poll(() => icon.evaluate((el) => Number(getComputedStyle(el.parentElement!).opacity))).toBeGreaterThan(0.9)

    await trigger.click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    const panel = page.getByRole('dialog')
    await expect.poll(() => panel.evaluate((el) => getComputedStyle(el).transform)).toBe('none')
    const anchoredEdge = await panel.evaluate((el, side) =>
      parseFloat(side === 'en' ? getComputedStyle(el).left : getComputedStyle(el).right), locale)
    expect(anchoredEdge).toBe(0)

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(trigger).toBeFocused()
  })
}

test('entry splash lasts at least two seconds, travels to the language-aware logo and lifts upward', async ({ browser }) => {
  for (const locale of ['en', 'fa'] as const) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()
    await page.goto(`/${locale}/projects`, { waitUntil: 'domcontentloaded' })

    const splash = page.locator('[data-splash-screen]')
    await expect(splash).toBeVisible()
    const visibleAt = Date.now()
    const mark = splash.locator('div').last()
    const start = (await mark.boundingBox())!
    expect(start.x + start.width / 2).toBeCloseTo(720, -1)
    expect(start.y + start.height / 2).toBeCloseTo(450, -1)

    await page.waitForTimeout(1400)
    const moving = (await mark.boundingBox())!
    if (locale === 'en') expect(moving.x + moving.width / 2).toBeLessThan(720)
    else expect(moving.x + moving.width / 2).toBeGreaterThan(720)

    const coverY = await splash.locator('div').first().evaluate((el) => el.getBoundingClientRect().y)
    expect(coverY).toBeLessThan(0)
    await expect(splash).toHaveCount(0, { timeout: 3000 })
    expect(Date.now() - visibleAt).toBeGreaterThanOrEqual(2000)

    // A real reload is a new entry and must replay the full splash. Client-side
    // navigation remains in the same document and is skipped by the component.
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.locator('[data-splash-screen]')).toBeVisible()
    const reloadVisibleAt = Date.now()
    await expect(page.locator('[data-splash-screen]')).toHaveCount(0, { timeout: 3500 })
    expect(Date.now() - reloadVisibleAt).toBeGreaterThanOrEqual(2000)
    await context.close()
  }
})
