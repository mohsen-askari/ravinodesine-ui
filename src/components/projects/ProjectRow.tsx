'use client'

import Image from 'next/image'
import { memo, useState } from 'react'
import type { CSSProperties, MouseEvent } from 'react'
import { Bidi } from '@/components/Bidi'
import { LinkIcon, MailIcon } from '@/components/Icons'
import type { ProjectView } from '@/content/localize'
import { useI18n } from '@/i18n/context'
import { formatArea, formatNumber, formatYear } from '@/i18n/format'
import { t } from '@/i18n/dictionary'
import { Panel } from './Panels'
import styles from './experience.module.css'

type Vars = CSSProperties & Record<`--${string}`, string | number>

interface Props {
  project: ProjectView
  /** Position among visible rows; the first few images load eagerly. */
  position: number
  /** `--p` as rendered on the server: 1 for a direct project URL, else 0. Never changes after mount. */
  initialP: number
  open: boolean
  panelsMounted: boolean
  byslug: Map<string, ProjectView>
  onOpen: (slug: string) => void
}

function ProjectRowImpl({ project, position, initialP, open, panelsMounted, byslug, onOpen }: Props) {
  const { locale, dict } = useI18n()
  // Frozen: React must never rewrite --p, which GSAP owns after mount.
  const [initialStyle] = useState<Vars>(() => ({ '--p': initialP, '--aspect': project.hero.width / project.hero.height }))
  const [copied, setCopied] = useState(false)
  const href = `/${locale}/projects/${project.slug}`
  const eager = position < 3

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Let the browser handle "open in new tab" and friends.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    if (!open) onOpen(project.slug)
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(new URL(href, window.location.origin).toString())
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked: the mail link remains */
    }
  }

  const badge = formatNumber(locale, project.index + 1, 2)

  return (
    <li className={styles.row} data-row={project.slug} data-open={initialP > 0.5 ? 'true' : 'false'} style={initialStyle}>
      <div
        className={styles.scroller}
        data-scroller
        {...(open
          ? { role: 'region', tabIndex: 0, 'aria-label': t(dict.project.stripLabel, { title: project.title }) }
          : {})}
      >
        <div className={styles.track}>
          <a
            href={href}
            className={styles.heroLink}
            data-panel="hero"
            aria-current={open ? 'page' : undefined}
            aria-label={open ? project.title : t(dict.overview.openProject, { title: project.title })}
            draggable={false}
            onClick={onClick}
          >
            <span className={styles.hero} style={{ backgroundColor: project.hero.tone }}>
              <Image
                src={project.hero.src}
                alt={project.hero.alt}
                fill
                sizes="(max-width: 719px) 90vw, (max-width: 1023px) 72vw, 58vw"
                placeholder="blur"
                blurDataURL={project.hero.blurDataURL}
                loading={eager ? 'eager' : 'lazy'}
                fetchPriority={eager ? 'high' : 'auto'}
                draggable={false}
                className={styles.heroImg}
              />
            </span>
            <span className={styles.caption}>
              <span className={styles.badge} aria-hidden="true">
                {badge}
              </span>
              <span>
                <h2 className={styles.title}>
                  <Bidi>{project.title}</Bidi>
                </h2>
                <p className={styles.place}>
                  <Bidi>{project.location}</Bidi>
                </p>
              </span>
            </span>
          </a>

          {panelsMounted && (
            <>
              <div className={styles.meta} data-reveal="meta" role="group" aria-label={project.title}>
                <dl className={styles.metaList}>
                  {project.client && (
                    <div>
                      <dt>{dict.meta.client}</dt>
                      <dd>
                        <Bidi>{project.client}</Bidi>
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt>{dict.meta.typology}</dt>
                    <dd>{dict.typology[project.typology]}</dd>
                  </div>
                  <div>
                    <dt>{dict.meta.size}</dt>
                    <dd>{formatArea(locale, project.area, dict.units.area)}</dd>
                  </div>
                  <div>
                    <dt>{dict.meta.year}</dt>
                    <dd>{formatYear(locale, project.year)}</dd>
                  </div>
                  <div>
                    <dt>{dict.meta.status}</dt>
                    <dd>{dict.status[project.status]}</dd>
                  </div>
                </dl>
                <div className={styles.share}>
                  <span className={styles.shareLabel}>{dict.meta.share}</span>
                  <div className={styles.shareActions}>
                    <button type="button" className={styles.shareBtn} onClick={copyLink} aria-label={dict.meta.copyLink} data-nodrag>
                      <LinkIcon />
                    </button>
                    <a
                      className={styles.shareBtn}
                      href={`mailto:?subject=${encodeURIComponent(project.title)}&body=${encodeURIComponent(`${project.title} — ${href}`)}`}
                      aria-label={dict.meta.shareMail}
                      data-nodrag
                    >
                      <MailIcon />
                    </a>
                  </div>
                  <span className={styles.shareStatus} role="status">
                    {copied ? dict.meta.linkCopied : ''}
                  </span>
                </div>
              </div>
              {project.panels.map((panel, i) => (
                <Panel key={i} panel={panel} index={i} onOpenProject={onOpen} byslug={byslug} />
              ))}
            </>
          )}
        </div>
      </div>
    </li>
  )
}

export const ProjectRow = memo(ProjectRowImpl)
