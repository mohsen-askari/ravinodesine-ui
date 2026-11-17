import type { Locale } from './config'
import type { Dictionary } from './dictionaries/en'
import { en } from './dictionaries/en'
import { fa } from './dictionaries/fa'

export type { Dictionary }

const dictionaries: Record<Locale, Dictionary> = { en, fa }

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale]
}

/** Replaces `{name}` placeholders. Values are stringified; unknown keys stay visible. */
export function t(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match))
}
