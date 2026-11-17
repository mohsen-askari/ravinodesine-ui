import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Footer } from '@/components/Footer'
import { Bidi, Ltr } from '@/components/Bidi'
import { getSite } from '@/content/source'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionary'
import styles from '../page.module.css'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  return isLocale(locale) ? { title: getDictionary(locale).pages.contact.title } : {}
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dict = getDictionary(locale)
  const page = dict.pages.contact
  const site = await getSite(locale)
  const c = site.contact
  return (
    <>
      <main id="content" className={styles.page}>
        <h1 className={styles.title}>{page.title}</h1>
        {c.lead && <p className={styles.lead}>{c.lead}</p>}
        <dl className={styles.facts}>
          {c.email && (
            <div>
              <dt>{dict.footer.email}</dt>
              <dd>
                <a href={`mailto:${c.email}`}>
                  <Ltr>{c.email}</Ltr>
                </a>
              </dd>
            </div>
          )}
          {c.phone && (
            <div>
              <dt>{locale === 'fa' ? 'تلفن' : 'Phone'}</dt>
              <dd>
                <a href={`tel:${c.phone.replace(/\s/g, '')}`}>
                  <Ltr>{c.phone}</Ltr>
                </a>
              </dd>
            </div>
          )}
          {c.web && (
            <div>
              <dt>{locale === 'fa' ? 'وب' : 'Web'}</dt>
              <dd>
                <Ltr>{c.web}</Ltr>
              </dd>
            </div>
          )}
          {c.address && (
            <div>
              <dt>{page.addressLabel}</dt>
              <dd>
                <Bidi>{c.address}</Bidi>
              </dd>
            </div>
          )}
          {c.hours && (
            <div>
              <dt>{locale === 'fa' ? 'ساعت کار' : 'Hours'}</dt>
              <dd>
                <Bidi>{c.hours}</Bidi>
              </dd>
            </div>
          )}
        </dl>
      </main>
      <Footer site={site} />
    </>
  )
}
