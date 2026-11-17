'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { locales, localeMeta, switchLocalePath } from '@/i18n/config'
import { t } from '@/i18n/dictionary'
import { useI18n } from '@/i18n/context'
import { captureViewState } from '@/lib/view-state'
import styles from './header.module.css'

/**
 * Switches to the same page in the other locale. The pathname comes from usePathname(), which
 * follows history.pushState, so an open project keeps its slug. Navigation is a soft Next.js
 * navigation (no document reload); the reader's place is carried over via view-state.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, dict } = useI18n()
  const pathname = usePathname()
  return (
    <nav aria-label={dict.language.label} className={className}>
      <ul className={styles.langList}>
        {locales.map((code) => {
          const meta = localeMeta[code]
          const current = code === locale
          return (
            <li key={code}>
              {current ? (
                <span
                  className={styles.langCurrent}
                  lang={code}
                  aria-label={t(dict.language.current, { language: meta.label })}
                  aria-current="true"
                >
                  {meta.short}
                </span>
              ) : (
                <Link
                  className={styles.langLink}
                  href={switchLocalePath(pathname, code)}
                  hrefLang={code}
                  lang={code}
                  scroll={false}
                  aria-label={t(dict.language.switchTo, { language: meta.label })}
                  onClick={() => captureViewState()}
                >
                  {meta.short}
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
