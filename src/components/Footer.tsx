'use client'

import type { SiteView } from '@/content/site'
import { t } from '@/i18n/dictionary'
import { useI18n } from '@/i18n/context'
import { Bidi, Ltr } from './Bidi'
import styles from './footer.module.css'

/** A part of the footer is left out when the site has nothing to put in it (for example no social links yet). */
export function Footer({ site }: { site: SiteView }) {
  const { dict } = useI18n()
  const { contact, social } = site
  const networks = dict.footer.networks as Record<string, string>
  return (
    <footer className={styles.footer}>
      <div className={styles.columns}>
        {contact.email && (
          <section>
            <h2 className={styles.label}>{dict.footer.email}</h2>
            <a className={styles.link} href={`mailto:${contact.email}`}>
              <Ltr>{contact.email}</Ltr>
            </a>
          </section>
        )}
        {(contact.address || contact.phone) && (
          <section>
            <h2 className={styles.label}>{dict.footer.office}</h2>
            <address className={styles.address}>
              {contact.address && <Bidi>{contact.address}</Bidi>}
              {contact.address && contact.phone && <br />}
              {contact.phone && (
                <a href={`tel:${contact.phone.replace(/\s/g, '')}`}>
                  <Ltr>{contact.phone}</Ltr>
                </a>
              )}
            </address>
          </section>
        )}
        {social.length > 0 && (
          <section>
            <h2 className={styles.label}>{dict.footer.social}</h2>
            <ul className={styles.list}>
              {social.map((link) => (
                <li key={`${link.platform}|${link.url}`}>
                  <a className={styles.link} href={link.url} target="_blank" rel="noopener noreferrer">
                    {networks[link.platform] ?? new URL(link.url).hostname}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section>
          <h2 className={styles.label}>{dict.footer.legal}</h2>
          <p className={styles.small}>{t(dict.footer.rights, { year: new Date().getFullYear() })}</p>
        </section>
      </div>
      <button
        type="button"
        className={styles.top}
        onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}
      >
        {dict.footer.backToTop}
      </button>
    </footer>
  )
}
