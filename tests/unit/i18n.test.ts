import { describe, expect, it } from 'vitest'
import { dirOf, isLocale, localizedPath, locales, stripLocale, switchLocalePath } from '@/i18n/config'
import { getDictionary, t } from '@/i18n/dictionary'
import { formatArea, formatNumber, formatYear } from '@/i18n/format'

function keysOf(obj: unknown, prefix = ''): string[] {
  if (Array.isArray(obj)) return [`${prefix}[${obj.length}]`]
  if (obj && typeof obj === 'object') return Object.entries(obj).flatMap(([k, v]) => keysOf(v, `${prefix}${prefix ? '.' : ''}${k}`))
  return [prefix]
}

describe('locale config', () => {
  it('maps locales to direction', () => {
    expect(dirOf('en')).toBe('ltr')
    expect(dirOf('fa')).toBe('rtl')
  })
  it('validates locales', () => {
    expect(isLocale('fa')).toBe(true)
    expect(isLocale('fr')).toBe(false)
    expect(isLocale(undefined)).toBe(false)
  })
  it('builds, switches and strips locale paths', () => {
    expect(localizedPath('fa', '/projects')).toBe('/fa/projects')
    expect(localizedPath('en')).toBe('/en')
    expect(switchLocalePath('/en/projects/zagros-lodge', 'fa')).toBe('/fa/projects/zagros-lodge')
    expect(switchLocalePath('/fa/projects', 'en')).toBe('/en/projects')
    expect(switchLocalePath('/projects', 'fa')).toBe('/fa/projects')
    expect(stripLocale('/fa/projects/x')).toBe('/projects/x')
    expect(stripLocale('/en')).toBe('/')
  })
})

describe('dictionaries', () => {
  it('Persian has exactly the same keys (and list lengths) as English', () => {
    expect(keysOf(getDictionary('fa')).sort()).toEqual(keysOf(getDictionary('en')).sort())
  })
  it('has no empty strings', () => {
    for (const locale of locales) for (const k of keysOf(getDictionary(locale))) expect(k).toBeTruthy()
    const walk = (o: unknown): string[] => (typeof o === 'string' ? [o] : Array.isArray(o) ? o.flatMap(walk) : o && typeof o === 'object' ? Object.values(o).flatMap(walk) : [])
    for (const locale of locales) for (const s of walk(getDictionary(locale))) expect(s.trim().length).toBeGreaterThan(0)
  })
  it('keeps the same placeholders in both languages', () => {
    const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
    const walk = (a: unknown, b: unknown, path: string) => {
      if (typeof a === 'string' && typeof b === 'string') expect(placeholders(b), path).toEqual(placeholders(a))
      else if (Array.isArray(a) && Array.isArray(b)) a.forEach((x, i) => walk(x, b[i], `${path}[${i}]`))
      else if (a && typeof a === 'object' && b && typeof b === 'object') for (const k of Object.keys(a)) walk((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`)
    }
    walk(getDictionary('en'), getDictionary('fa'), '')
  })
  it('interpolates and leaves unknown placeholders visible', () => {
    expect(t('Open {title} ({n})', { title: 'X', n: 3 })).toBe('Open X (3)')
    expect(t('Hello {missing}')).toBe('Hello {missing}')
  })
})

describe('formatting', () => {
  it('uses Persian digits and the Solar Hijri calendar in Persian', () => {
    expect(formatYear('fa', 2025)).toBe('۱۴۰۴')
    expect(formatYear('en', 2025)).toBe('2025')
    expect(formatNumber('fa', 12)).toBe('۱۲')
    expect(formatNumber('en', 12, 2)).toBe('12')
    expect(formatNumber('fa', 1, 2)).toBe('۰۱')
  })
  it('formats areas with grouping and a localized unit', () => {
    expect(formatArea('en', 12400, 'm²')).toBe('12,400 m²')
    expect(formatArea('fa', 12400, 'متر مربع')).toMatch(/^۱۲[٬,]۴۰۰ متر مربع$/)
  })
})
