'use client'

import { Fragment } from 'react'
import { useI18n } from '@/i18n/context'

// A maximal run of Latin text: letters/digits plus the connectors that appear inside
// names, units, standards and addresses ("Lund & Partners", "ISO 14001", "a@b.studio",
// "32.6366° N, 51.6676° E"). Persian letters, Persian digits and Persian punctuation
// (، ؛ ؟) are never matched.
const LATIN_RUN = /[A-Za-z0-9@][A-Za-z0-9@.\-_/:&+×%'’°, ]*[A-Za-z0-9%°]|[A-Za-z0-9]/g

/**
 * In right-to-left locales, wraps Latin fragments in <bdi dir="ltr"> so neighbouring
 * punctuation and numbers cannot reorder them. In LTR locales the text is untouched.
 */
export function Bidi({ children }: { children: string }) {
  const { dir } = useI18n()
  if (dir !== 'rtl') return <>{children}</>
  const out: React.ReactNode[] = []
  let last = 0
  for (const m of children.matchAll(LATIN_RUN)) {
    const start = m.index ?? 0
    if (start > last) out.push(<Fragment key={`t${last}`}>{children.slice(last, start)}</Fragment>)
    out.push(
      <bdi key={`l${start}`} dir="ltr">
        {m[0]}
      </bdi>,
    )
    last = start + m[0].length
  }
  if (last < children.length) out.push(<Fragment key={`t${last}`}>{children.slice(last)}</Fragment>)
  return <>{out}</>
}

/** Always-LTR isolate for e-mails, URLs, phone numbers and coordinates. */
export function Ltr({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <bdi dir="ltr" className={className}>
      {children}
    </bdi>
  )
}
