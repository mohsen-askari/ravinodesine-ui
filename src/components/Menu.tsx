'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { localizedPath, stripLocale } from '@/i18n/config'
import { useI18n } from '@/i18n/context'
import { CloseIcon } from './Icons'
import { LanguageSwitcher } from './LanguageSwitcher'
import { useUi } from './ui-state'
import styles from './header.module.css'

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Menu() {
  const { locale, dict } = useI18n()
  const { menuOpen, setMenuOpen, filter, setFilter } = useUi()
  const pathname = usePathname()
  const panelRef = useRef<HTMLDivElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const section = stripLocale(pathname)

  const close = () => setMenuOpen(false)

  // Close on route change.
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname, setMenuOpen])

  // Focus management: move into the dialog, trap Tab, restore on close.
  useEffect(() => {
    if (!menuOpen) return
    returnFocus.current = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
    document.body.dataset.menuOpen = 'true'

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setMenuOpen(false)
        return
      }
      if (e.key !== 'Tab' || !panel) return
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      delete document.body.dataset.menuOpen
      returnFocus.current?.focus()
    }
  }, [menuOpen, setMenuOpen])

  const links = [
    { href: localizedPath(locale, '/projects'), label: dict.nav.projects, active: section.startsWith('/projects') },
    { href: localizedPath(locale, '/studio'), label: dict.nav.studio, active: section.startsWith('/studio') },
    { href: localizedPath(locale, '/contact'), label: dict.nav.contact, active: section.startsWith('/contact') },
  ]

  return (
    <div className={styles.menuRoot} data-open={menuOpen} hidden={!menuOpen}>
      <div className={styles.backdrop} onClick={close} aria-hidden="true" />
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={dict.nav.menu}
      >
        <button type="button" className={styles.panelClose} onClick={close} aria-label={dict.nav.closeMenu}>
          <CloseIcon />
        </button>
        <nav aria-label={dict.nav.primary}>
          <ul className={styles.panelLinks}>
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} aria-current={l.active ? 'page' : undefined} onClick={close}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.panelBlock}>
          <p className={styles.panelLabel}>{dict.filters.label}</p>
          <ul className={styles.panelFilters}>
            {(['all', 'architecture', 'interiors', 'landscape', 'planning'] as const).map((key) => (
              <li key={key}>
                <Link
                  href={localizedPath(locale, '/projects')}
                  aria-current={filter === key ? 'true' : undefined}
                  onClick={() => {
                    setFilter(key)
                    close()
                  }}
                >
                  {dict.filters[key]}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.panelBlock}>
          <p className={styles.panelLabel}>{dict.language.label}</p>
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  )
}
