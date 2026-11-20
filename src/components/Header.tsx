'use client'

import { usePathname } from 'next/navigation'
import { stripLocale } from '@/i18n/config'
import { useI18n } from '@/i18n/context'
import type { CategoryKey } from '@/content/types'
import { LanguageSwitcher } from './LanguageSwitcher'
import { Menu } from './Menu'
import { MenuIcon } from './Icons'
import { useUi } from './ui-state'
import styles from './header.module.css'

export const categories: CategoryKey[] = ['architecture', 'interiors', 'landscape', 'planning']

export function Header() {
  const { dict } = useI18n()
  const pathname = usePathname()
  const { filter, setFilter, menuOpen, setMenuOpen } = useUi()
  const onProjects = stripLocale(pathname).startsWith('/projects')

  return (
    <>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.brandMenu}
          data-menu-trigger
          data-open={menuOpen}
          aria-expanded={menuOpen}
          aria-haspopup="dialog"
          aria-label={dict.nav.openMenu}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span className={styles.wordmarkName} data-wordmark>{dict.site.name}</span>
          <span className={styles.brandMenuIcon}><MenuIcon /></span>
        </button>

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
        </div>
      </header>
      <Menu />
    </>
  )
}
