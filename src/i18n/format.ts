import type { Locale } from './config'
import { localeMeta } from './config'

export function formatNumber(locale: Locale, value: number, minDigits = 1): string {
  return new Intl.NumberFormat(localeMeta[locale].intl, { minimumIntegerDigits: minDigits }).format(value)
}

/**
 * Years follow the reader's calendar: Gregorian in English, Solar Hijri in Persian
 * (2025 -> ۱۴۰۴). A mid-year date avoids edge cases at the calendar boundary.
 */
export function formatYear(locale: Locale, year: number): string {
  const { intl, calendar } = localeMeta[locale]
  const tag = calendar ? `${intl}-u-ca-${calendar}` : intl
  return new Intl.DateTimeFormat(tag, { year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, 5, 15)))
}

/** "12,400 m²" / "۱۲٬۴۰۰ متر مربع" with the unit isolated so it never reorders. */
export function formatArea(locale: Locale, area: number, unit: string): string {
  return `${formatNumber(locale, area)} ${unit}`
}

export function formatCount(locale: Locale, n: number): string {
  return formatNumber(locale, n)
}
