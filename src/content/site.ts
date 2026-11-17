import type { Locale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'
import type { FactView } from './localize'

/**
 * The studio, contact and footer content of one locale. In `static` mode it is built from the dictionaries (as the UI
 * always did); in `api` mode from `GET /api/v1/{locale}/site`. A value the API does not have is `null`/empty and the
 * page leaves that part out; nothing is filled in from the demo copy.
 */
export interface SiteView {
  studio: { lead: string | null; body: string[]; facts: FactView[] }
  contact: { lead: string | null; email: string | null; phone: string | null; web: string | null; address: string | null; hours: string | null }
  social: SocialLinkView[]
}
export interface SocialLinkView {
  platform: string
  url: string
}

/** What the UI showed before any backend existed: the same two links, from the dictionaries and the footer. */
const STATIC_SOCIAL: SocialLinkView[] = [
  { platform: 'instagram', url: 'https://www.instagram.com/' },
  { platform: 'linkedin', url: 'https://www.linkedin.com/' },
]

export function staticSite(locale: Locale): SiteView {
  const { studio, contact } = getDictionary(locale).pages
  return {
    studio: { lead: studio.lead, body: [...studio.body], facts: studio.facts.map(([label, value]) => ({ label, value })) },
    contact: { lead: contact.lead, email: contact.email, phone: contact.phone, web: contact.web, address: contact.address, hours: contact.hours },
    social: STATIC_SOCIAL,
  }
}

type Json = Record<string, unknown>
const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v)

function text(v: unknown, path: string): string | null {
  if (v === null || v === undefined) return null
  if (typeof v !== 'string') throw new Error(`Unexpected API response: ${path} should be a string or null.`)
  return v.trim() === '' ? null : v
}
function list(v: unknown, path: string): unknown[] {
  if (!Array.isArray(v)) throw new Error(`Unexpected API response: ${path} should be a list.`)
  return v
}

/** Shown without its scheme, as the contact page always showed it ("www.ravino.studio"). */
export function displayWeb(url: string): string {
  return url.replace(/^https:\/\//i, '').replace(/\/$/, '')
}

export function mapSite(json: unknown, locale: Locale): SiteView {
  if (!isObj(json) || !isObj(json.data) || !isObj(json.meta)) throw new Error('Unexpected API response: site has no data.')
  if (json.meta.locale !== locale) throw new Error(`Unexpected API response: site is not in "${locale}".`)
  const { studio, contact, social } = json.data
  if (!isObj(studio) || !isObj(contact)) throw new Error('Unexpected API response: site.studio and site.contact are required.')
  const web = text(contact.web, 'site.contact.web')

  return {
    studio: {
      lead: text(studio.lead, 'site.studio.lead'),
      body: list(studio.body, 'site.studio.body').map((p, i) => text(p, `site.studio.body[${i}]`)).filter((p): p is string => p !== null),
      facts: list(studio.facts, 'site.studio.facts').flatMap((f, i) => {
        if (!isObj(f)) throw new Error(`Unexpected API response: site.studio.facts[${i}] should be an object.`)
        const label = text(f.label, `site.studio.facts[${i}].label`)
        const value = text(f.value, `site.studio.facts[${i}].value`)
        return label && value ? [{ label, value }] : []
      }),
    },
    contact: {
      lead: text(contact.lead, 'site.contact.lead'),
      email: text(contact.email, 'site.contact.email'),
      phone: text(contact.phone, 'site.contact.phone'),
      web: web ? displayWeb(web) : null,
      address: text(contact.address, 'site.contact.address'),
      hours: text(contact.hours, 'site.contact.hours'),
    },
    // Only plain https links are ever rendered, whatever the API sends.
    social: list(social, 'site.social').flatMap((l, i) => {
      if (!isObj(l)) throw new Error(`Unexpected API response: site.social[${i}] should be an object.`)
      const platform = text(l.platform, `site.social[${i}].platform`)
      const url = text(l.url, `site.social[${i}].url`)
      return platform && url && isHttpsUrl(url) ? [{ platform, url }] : []
    }),
  }
}

export function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.username === '' && url.password === ''
  } catch {
    return false
  }
}
