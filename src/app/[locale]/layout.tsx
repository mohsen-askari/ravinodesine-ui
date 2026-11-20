import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import '@fontsource-variable/hanken-grotesk'
import '@fontsource-variable/vazirmatn'
import '../globals.css'
import { Header } from '@/components/Header'
import { SplashScreen } from '@/components/SplashScreen'
import { UiProvider } from '@/components/ui-state'
import { I18nProvider } from '@/i18n/context'
import { dirOf, isLocale, locales } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'

// true (not false): a project added after the build gets its page on first request (with `false` every path that was not
// prebuilt answers 404, and so would an invalidated page). Anything that is not en/fa still ends in notFound() below.
export const dynamicParams = true

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff',
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  if (!isLocale(locale)) return {}
  const dict = getDictionary(locale)
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
    title: { default: `${dict.site.name} — ${dict.site.descriptor}`, template: `%s — ${dict.site.name}` },
    description: dict.site.description,
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dir = dirOf(locale)
  const dict = getDictionary(locale)

  return (
    <html lang={locale} dir={dir}>
      <body>
        <I18nProvider locale={locale} dir={dir} dict={dict}>
          <UiProvider>
            <SplashScreen />
            <a className="skip-link" href="#content">
              {dict.nav.skipToContent}
            </a>
            <Header />
            {children}
          </UiProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
