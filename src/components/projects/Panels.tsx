'use client'

import Image from 'next/image'
import type { CSSProperties } from 'react'
import { Bidi, Ltr } from '@/components/Bidi'
import { useI18n } from '@/i18n/context'
import { t } from '@/i18n/dictionary'
import type { ImageView, PanelView, ProjectView } from '@/content/localize'
import styles from './panels.module.css'

type Vars = CSSProperties & Record<`--${string}`, string | number>

/** A still image whose box keeps its true aspect ratio (so crops never surprise). */
function Picture({ image, sizes, eager }: { image: ImageView; sizes: string; eager?: boolean }) {
  return (
    <div className={styles.picture} style={{ '--ar': image.width / image.height, backgroundColor: image.tone } as Vars}>
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes={sizes}
        placeholder="blur"
        blurDataURL={image.blurDataURL}
        draggable={false}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : 'auto'}
        className={styles.img}
      />
    </div>
  )
}

const SIZES = '(max-width: 719px) 82vw, (max-width: 1023px) 62vw, 46vw'

interface PanelProps {
  panel: PanelView
  index: number
  /** Opens another project (related panel). */
  onOpenProject: (slug: string) => void
  byslug: Map<string, ProjectView>
}

export function Panel({ panel, index, onOpenProject, byslug }: PanelProps) {
  const { dict, locale } = useI18n()
  // Panels beyond the first few are far off-screen; let the browser defer them.
  const eager = index < 3
  const common = { 'data-panel': panel.type, 'data-reveal': 'panel', 'data-rhythm': index % 3 } as const

  switch (panel.type) {
    case 'summary':
      return (
        <section className={`${styles.panel} ${styles.text}`} {...common} aria-label={dict.project.about}>
          <p className={styles.lead}>
            <Bidi>{panel.lead}</Bidi>
          </p>
          {panel.body.map((para) => (
            <p key={para} className={styles.body}>
              <Bidi>{para}</Bidi>
            </p>
          ))}
          <dl className={styles.factList}>
            {panel.facts.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd>
                  <Bidi>{f.value}</Bidi>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )
    case 'intro':
      return (
        <section className={`${styles.panel} ${styles.text}`} {...common}>
          {panel.heading && (
            <h3 className={styles.heading}>
              <Bidi>{panel.heading}</Bidi>
            </h3>
          )}
          {panel.body.map((para) => (
            <p key={para} className={styles.body}>
              <Bidi>{para}</Bidi>
            </p>
          ))}
        </section>
      )
    case 'image':
      return (
        <figure className={`${styles.panel} ${styles.figure}`} data-shape={panel.shape} {...common} style={{ '--ar': panel.image.width / panel.image.height } as Vars}>
          <Picture image={panel.image} sizes={SIZES} eager={eager} />
          {panel.caption && (
            <figcaption className={styles.caption}>
              <Bidi>{panel.caption}</Bidi>
            </figcaption>
          )}
        </figure>
      )
    case 'imagePair':
      return (
        <div className={`${styles.panel} ${styles.pair}`} {...common}>
          {panel.images.map((image, i) => (
            <figure key={image.src} className={styles.pairItem} style={{ '--ar': image.width / image.height } as Vars}>
              <Picture image={image} sizes={SIZES} eager={eager} />
              {panel.captions && (
                <figcaption className={styles.caption}>
                  <Bidi>{panel.captions[i]}</Bidi>
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      )
    case 'quote':
      return (
        <figure className={`${styles.panel} ${styles.quote}`} {...common}>
          <blockquote>
            <p>
              <Bidi>{panel.text}</Bidi>
            </p>
          </blockquote>
          <figcaption className={styles.attribution}>
            <Bidi>{panel.attribution}</Bidi>
          </figcaption>
        </figure>
      )
    case 'diagram':
      return (
        <figure className={`${styles.panel} ${styles.figure}`} data-shape="diagram" {...common} style={{ '--ar': panel.image.width / panel.image.height } as Vars}>
          <Picture image={panel.image} sizes={SIZES} eager={eager} />
          <figcaption className={styles.caption}>
            <Bidi>{panel.caption}</Bidi>
          </figcaption>
        </figure>
      )
    case 'facts':
      return (
        <section className={`${styles.panel} ${styles.text} ${styles.factsPanel}`} {...common}>
          <h3 className={styles.heading}>
            <Bidi>{panel.heading}</Bidi>
          </h3>
          <dl className={styles.bigFacts}>
            {panel.items.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd>
                  <Bidi>{f.value}</Bidi>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )
    case 'context':
      return (
        <section className={`${styles.panel} ${styles.text}`} {...common}>
          <h3 className={styles.heading}>
            <Bidi>{panel.heading}</Bidi>
          </h3>
          <p className={styles.body}>
            <Bidi>{panel.body}</Bidi>
          </p>
          <p className={styles.coords}>
            <span className={styles.coordsLabel}>{dict.meta.coordinates}</span>
            <Ltr>{panel.coordinates}</Ltr>
          </p>
        </section>
      )
    case 'credits':
      return (
        <section className={`${styles.panel} ${styles.credits}`} {...common}>
          <h3 className={styles.heading}>{dict.project.credits}</h3>
          <div className={styles.creditColumns}>
            {panel.groups.map((g) => (
              <div key={g.role}>
                <h4 className={styles.role}>
                  <Bidi>{g.role}</Bidi>
                </h4>
                <ul>
                  {g.names.map((name) => (
                    <li key={name}>
                      <Bidi>{name}</Bidi>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )
    case 'related': {
      const items = panel.slugs.map((s) => byslug.get(s)).filter((p): p is ProjectView => !!p)
      return (
        <section className={`${styles.panel} ${styles.related}`} {...common}>
          <h3 className={styles.heading}>{dict.project.related}</h3>
          <ul className={styles.relatedList}>
            {items.map((p) => (
              <li key={p.slug}>
                <a
                  href={`/${locale}/projects/${p.slug}`}
                  aria-label={t(dict.project.openRelated, { title: p.title })}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
                    e.preventDefault()
                    onOpenProject(p.slug)
                  }}
                >
                  <span className={styles.relatedThumb} style={{ '--ar': p.hero.width / p.hero.height, backgroundColor: p.hero.tone } as Vars}>
                    <Image src={p.hero.src} alt="" fill sizes="240px" draggable={false} className={styles.img} placeholder="blur" blurDataURL={p.hero.blurDataURL} />
                  </span>
                  <span className={styles.relatedTitle}>
                    <Bidi>{p.title}</Bidi>
                  </span>
                  <span className={styles.relatedPlace}>
                    <Bidi>{p.location}</Bidi>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )
    }
  }
}
