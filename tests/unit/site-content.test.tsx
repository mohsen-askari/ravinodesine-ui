/* eslint-disable @typescript-eslint/no-explicit-any -- the tests edit JSON fixtures of a shape they deliberately break */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Footer } from '@/components/Footer'
import { displayWeb, isHttpsUrl, mapSite, staticSite, type SiteView } from '@/content/site'
import { I18nProvider } from '@/i18n/context'
import { getDictionary } from '@/i18n/dictionary'
import { locales, type Locale } from '@/i18n/config'

const fixture = (name: string): any => JSON.parse(readFileSync(path.resolve(__dirname, '../fixtures/api', `${name}.json`), 'utf8'))

const footerHtml = (locale: Locale, site: SiteView) =>
  renderToStaticMarkup(
    <I18nProvider locale={locale} dir={locale === 'fa' ? 'rtl' : 'ltr'} dict={getDictionary(locale)}>
      <Footer site={site} />
    </I18nProvider>,
  )

describe.each(locales)('site content (%s)', (locale) => {
  it('maps the API answer to what the dictionaries held, apart from the web address scheme', () => {
    const fromApi = mapSite(fixture(`site-${locale}`), locale)
    const fromDictionary = staticSite(locale)

    expect(fromApi.studio).toEqual(fromDictionary.studio)
    expect(fromApi.contact).toEqual(fromDictionary.contact) // "https://www.ravino.studio" is shown as "www.ravino.studio"
  })

  it('has no social links when the backend has none yet (the generic home pages are not the studio’s accounts)', () => {
    expect(mapSite(fixture(`site-${locale}`), locale).social).toEqual([])
  })
})

describe('the footer', () => {
  it('leaves the social column out entirely when the list is empty, in both languages', () => {
    for (const locale of locales) {
      const site = mapSite(fixture(`site-${locale}`), locale)
      const html = footerHtml(locale, site)

      expect(html).not.toContain(getDictionary(locale).footer.social)
      expect(html).not.toMatch(/<ul/)
      expect(html).not.toContain('instagram')
      expect(html).not.toContain('linkedin')
      expect(html).toContain(getDictionary(locale).footer.email) // the rest is still there
      expect(html).toContain(getDictionary(locale).footer.legal)
      expect(html).toContain(getDictionary(locale).footer.backToTop)
    }
  })

  it('shows each link with its network name, opening safely in a new tab, in the editors’ order', () => {
    const site = mapSite({ ...fixture('site-en'), data: { ...fixture('site-en').data, social: [
      { platform: 'linkedin', url: 'https://www.linkedin.com/company/ravino' },
      { platform: 'instagram', url: 'https://www.instagram.com/ravino.studio' },
      { platform: 'aparat', url: 'https://www.aparat.com/ravino' },
    ] } }, 'en')
    const html = footerHtml('en', site)

    expect(html.indexOf('LinkedIn')).toBeLessThan(html.indexOf('Instagram'))
    expect(html).toContain('href="https://www.instagram.com/ravino.studio" target="_blank" rel="noopener noreferrer"')
    expect(html).toContain('>Aparat<')
    expect(footerHtml('fa', { ...site }).includes('آپارات')).toBe(true)
  })

  it('names an unknown network by its host rather than showing nothing', () => {
    const html = footerHtml('en', { ...staticSite('en'), social: [{ platform: 'mastodon', url: 'https://social.example/@ravino' }] })
    expect(html).toContain('>social.example<')
  })

  it('renders the static site exactly as before: the same two links, e-mail and office', () => {
    const html = footerHtml('en', staticSite('en'))
    expect(html).toContain('href="https://www.instagram.com/"')
    expect(html).toContain('href="https://www.linkedin.com/"')
    expect(html).toContain('href="mailto:hello@ravino.studio"')
    expect(html).toContain('href="tel:+982155550142"')
    expect(html).toContain('No. 12, Valiasr Avenue, Tehran, Iran')
  })

  it('leaves out the e-mail and the office when the site has none of them', () => {
    const html = footerHtml('en', { ...staticSite('en'), contact: { lead: null, email: null, phone: null, web: null, address: null, hours: null }, social: [] })
    expect(html).not.toContain('mailto:')
    expect(html).not.toContain('<address')
    expect(html).toContain('Back to top')
  })
})

describe('site mapping safety and tolerance', () => {
  const site = (over: Record<string, unknown>) => ({ data: { studio: { lead: null, body: [], facts: [] }, contact: { lead: null, email: null, phone: null, web: null, address: null, hours: null }, social: [], ...over }, meta: { locale: 'en', revision: 1 } })

  it('renders only plain https links, whatever the API sends', () => {
    const view = mapSite(site({ social: [
      { platform: 'instagram', url: 'https://www.instagram.com/ok' },
      { platform: 'other', url: 'javascript:alert(1)' },
      { platform: 'other', url: 'http://insecure.example/' },
      { platform: 'other', url: 'https://user:pass@example.com/' },
      { platform: 'other', url: 'not a url' },
      { platform: 'other', url: 'data:text/html,x' },
    ] }), 'en')
    expect(view.social).toEqual([{ platform: 'instagram', url: 'https://www.instagram.com/ok' }])
  })

  it('accepts an entirely empty site: every text null, every list empty', () => {
    const view = mapSite(site({}), 'en')
    expect(view.studio).toEqual({ lead: null, body: [], facts: [] })
    expect(view.contact.email).toBeNull()
    expect(view.social).toEqual([])
  })

  it('drops blank texts and half facts', () => {
    const view = mapSite(site({ studio: { lead: '  ', body: ['One', ' '], facts: [{ label: 'A', value: '' }, { label: 'B', value: '2' }] } }), 'en')
    expect(view.studio).toEqual({ lead: null, body: ['One'], facts: [{ label: 'B', value: '2' }] })
  })

  it.each([
    ['not an envelope', null],
    ['no data', { meta: { locale: 'en' } }],
    ['another language', { ...site({}), meta: { locale: 'fa' } }],
    ['no studio', { ...site({}), data: { contact: {}, social: [] } }],
    ['social that is not a list', site({ social: {} })],
    ['a number as text', site({ contact: { lead: 5 } })],
  ])('rejects %s', (_name, json) => {
    expect(() => mapSite(json, 'en')).toThrow()
  })

  it('shows the web address without its scheme and trailing slash', () => {
    expect(displayWeb('https://www.ravino.studio')).toBe('www.ravino.studio')
    expect(displayWeb('https://www.ravino.studio/')).toBe('www.ravino.studio')
    expect(displayWeb('https://www.ravino.studio/fa')).toBe('www.ravino.studio/fa')
  })

  it('recognises https URLs without credentials only', () => {
    expect(isHttpsUrl('https://example.com/a?b=c')).toBe(true)
    for (const bad of ['http://example.com', 'ftp://example.com', 'https://u@example.com', '//example.com', '']) expect(isHttpsUrl(bad)).toBe(false)
  })
})
