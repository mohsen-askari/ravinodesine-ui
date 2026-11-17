import { expect, test } from '@playwright/test'
import { clickHero, gotoProjects, row, settle } from './helpers'

test('category filter narrows the overview and an excluded open project closes', async ({ page }) => {
  await gotoProjects(page, 'en')
  await expect(page.locator('[data-row]')).toHaveCount(8)
  await page.getByRole('button', { name: 'Interiors' }).click()
  await expect(page.locator('[data-row]')).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Interiors' })).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: 'All', exact: true }).click()
  await expect(page.locator('[data-row]')).toHaveCount(8)
  await clickHero(page, 'zagros-lodge')
  await settle(page, 'active')
  await page.getByRole('button', { name: 'Landscape' }).click()
  await settle(page, 'overview')
  await expect(page).toHaveURL(/\/en\/projects$/)
  await expect(page.locator('[data-row]')).toHaveCount(1)
  await expect(row(page, 'hormuz-shore-walk')).toBeVisible()
})

test('filters are localized and work in Persian', async ({ page }) => {
  await gotoProjects(page, 'fa')
  await page.getByRole('button', { name: 'فضای داخلی' }).click()
  await expect(page.locator('[data-row]')).toHaveCount(1)
  await expect(page.locator('[data-row] h2')).toContainText('آتلیه نقش')
})

test('menu dialog: opens, traps focus, closes with Escape and returns focus', async ({ page }) => {
  await gotoProjects(page, 'en')
  const open = page.getByRole('button', { name: 'Open menu' })
  await open.click()
  const dialog = page.getByRole('dialog', { name: 'Menu' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('link', { name: 'Studio' })).toBeVisible()
  for (let i = 0; i < 12; i++) await page.keyboard.press('Tab')
  expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(open).toBeFocused()
})

test('studio and contact pages render in both locales with the right direction', async ({ page }) => {
  for (const [locale, dir] of [['en', 'ltr'], ['fa', 'rtl']] as const) {
    for (const path of ['studio', 'contact']) {
      await page.goto(`/${locale}/${path}`)
      await expect(page.locator('html')).toHaveAttribute('dir', dir)
      await expect(page.locator('h1')).toBeVisible()
    }
  }
})
