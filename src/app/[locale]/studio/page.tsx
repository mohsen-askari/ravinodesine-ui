import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Footer } from '@/components/Footer'
import { Bidi } from '@/components/Bidi'
import { getSite } from '@/content/source'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'
import styles from '../page.module.css'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  return isLocale(locale) ? { title: getDictionary(locale).pages.studio.title } : {}
}

export default async function StudioPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const { studio: page } = getDictionary(locale).pages
  const site = await getSite(locale)
  const { studio } = site
  return (
    <>
      <main id="content" className={styles.page}>
        <h1 className={styles.title}>{page.title}</h1>
        {studio.lead && (
          <p className={styles.lead}>
            <Bidi>{studio.lead}</Bidi>
          </p>
        )}
        <div className={styles.body}>
          {studio.body.map((paragraph) => (
            <p key={paragraph}>
              <Bidi>{paragraph}</Bidi>
            </p>
          ))}
        </div>
        {studio.facts.length > 0 && (
          <dl className={styles.facts}>
            {studio.facts.map(({ label, value }) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  <Bidi>{value}</Bidi>
                </dd>
              </div>
            ))}
          </dl>
        )}
      </main>
      <Footer site={site} />
    </>
  )
}
