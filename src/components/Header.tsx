'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { localizedPath, stripLocale } from '@/i18n/config'
import { useI18n } from '@/i18n/context'
import type { CategoryKey } from '@/content/types'
import { LanguageSwitcher } from './LanguageSwitcher'
import { Menu } from './Menu'
import { MenuIcon } from './Icons'
import { useUi } from './ui-state'
import styles from './header.module.css'

export const categories: CategoryKey[] = ['architecture', 'interiors', 'landscape', 'planning']

export function Header() {
  const { locale, dict } = useI18n()
  const pathname = usePathname()
  const { filter, setFilter, menuOpen, setMenuOpen } = useUi()
  const onProjects = stripLocale(pathname).startsWith('/projects')

  return (
    <>
      <header className={styles.header}>
        <Link href={localizedPath(locale, '/projects')} className={styles.wordmark} aria-label={dict.nav.home}>
          <span className={styles.wordmarkName}>{dict.site.name}</span>
        </Link>

        {onProjects && (
          <nav className={styles.filters} aria-label={dict.filters.label}>
            <ul className={styles.filterList}>
              {(['all', ...categories] as const).map((key) => (
                <li key={key}>
                  <button
                    type="button"
                    className={styles.filter}
                    aria-pressed={filter === key}
                    onClick={() => setFilter(key)}
                  >
                    {dict.filters[key]}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className={styles.end}>
          <LanguageSwitcher />
          <button
            type="button"
            className={styles.menuButton}
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
            aria-label={dict.nav.openMenu}
            onClick={() => setMenuOpen(true)}
          >
            <MenuIcon />
          </button>
        </div>
      </header>
      <Menu />
    </>
  )
}
