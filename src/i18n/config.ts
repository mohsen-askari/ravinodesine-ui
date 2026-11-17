export const locales = ['en', 'fa'] as const
export type Locale = (typeof locales)[number]
export type Direction = 'ltr' | 'rtl'

export const defaultLocale: Locale = 'en'

export const localeMeta: Record<
  Locale,
  { dir: Direction; label: string; short: string; intl: string; calendar?: string }
> = {
  en: { dir: 'ltr', label: 'English', short: 'EN', intl: 'en-US' },
  // Persian numerals and the Solar Hijri calendar for years.
  fa: { dir: 'rtl', label: 'فارسی', short: 'FA', intl: 'fa-IR', calendar: 'persian' },
}

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value)
}

export function dirOf(locale: Locale): Direction {
  return localeMeta[locale].dir
}

/** Builds a locale-prefixed path: localizedPath('fa', '/projects/x') -> '/fa/projects/x'. */
export function localizedPath(locale: Locale, path = '/'): string {
  const clean = path.startsWith('/') ? path : `/${path}`
  return clean === '/' ? `/${locale}` : `/${locale}${clean}`
}

/** Swaps the locale segment of a pathname, keeping the rest ("/en/projects/x" -> "/fa/projects/x"). */
export function switchLocalePath(pathname: string, next: Locale): string {
  const parts = pathname.split('/')
  if (isLocale(parts[1])) parts[1] = next
  else parts.splice(1, 0, next)
  return parts.join('/') || `/${next}`
}

/** Strips the locale segment: "/fa/projects/x" -> "/projects/x". */
export function stripLocale(pathname: string): string {
  const parts = pathname.split('/')
  if (isLocale(parts[1])) parts.splice(1, 1)
  return parts.join('/') || '/'
}
