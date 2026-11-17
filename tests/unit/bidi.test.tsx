import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Bidi, Ltr } from '@/components/Bidi'
import { I18nProvider } from '@/i18n/context'
import { getDictionary } from '@/i18n/dictionary'

const render = (locale: 'en' | 'fa', text: string) =>
  renderToStaticMarkup(
    <I18nProvider locale={locale} dir={locale === 'fa' ? 'rtl' : 'ltr'} dict={getDictionary(locale)}>
      <Bidi>{text}</Bidi>
    </I18nProvider>,
  )

describe('<Bidi>', () => {
  it('leaves English text untouched', () => {
    expect(render('en', 'Atelier Nord, Oslo')).toBe('Atelier Nord, Oslo')
  })
  it('isolates Latin names inside Persian text and keeps Persian punctuation outside the isolate', () => {
    expect(render('fa', 'Atelier Nord، اسلو')).toBe('<bdi dir="ltr">Atelier Nord</bdi>، اسلو')
  })
  it('isolates multi-word names, standards and ampersands as one unit', () => {
    expect(render('fa', 'همکار: Lund & Partners در LEED Gold')).toBe('همکار: <bdi dir="ltr">Lund &amp; Partners</bdi> در <bdi dir="ltr">LEED Gold</bdi>')
    expect(render('fa', 'استاندارد ISO 14001')).toContain('<bdi dir="ltr">ISO 14001</bdi>')
  })
  it('does not isolate Persian digits or Persian-only strings', () => {
    expect(render('fa', '۱۴ متر، ۳٫۶ متر')).not.toContain('<bdi')
  })
  it('isolates e-mail addresses and keeps the parenthesis outside', () => {
    const out = render('fa', 'ایمیل (research@ravino.studio)')
    expect(out).toContain('<bdi dir="ltr">research@ravino.studio</bdi>')
  })
  it('<Ltr> always forces an LTR isolate', () => {
    expect(renderToStaticMarkup(<Ltr>+98 21 5555 0142</Ltr>)).toBe('<bdi dir="ltr">+98 21 5555 0142</bdi>')
  })
})
