'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { useI18n } from '@/i18n/context'
import { prefersReducedMotion } from '@/hooks/useReducedMotion'
import styles from './splash.module.css'

let playedInThisDocument = false

type SplashWindow = Window & { __RAVINO_SKIP_SPLASH__?: boolean }

/**
 * Every full page entry follows the same choreography as the visual reference:
 * a centred mark travels to the real header mark while a black cover lifts away.
 * Client-side navigation in the same document does not replay it. The destination
 * is measured, so it remains exact across LTR, RTL and breakpoints.
 */
export function SplashScreen() {
  const { dict } = useI18n()
  const [visible, setVisible] = useState(true)
  const coverRef = useRef<HTMLDivElement>(null)
  const markRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (playedInThisDocument || (window as SplashWindow).__RAVINO_SKIP_SPLASH__) {
      // Hide synchronously before paint; remove the inert React node in a microtask.
      if (coverRef.current?.parentElement) coverRef.current.parentElement.style.display = 'none'
      queueMicrotask(() => setVisible(false))
      return
    }

    const cover = coverRef.current
    const mark = markRef.current
    const trigger = document.querySelector<HTMLElement>('[data-menu-trigger]')
    if (!cover || !mark || !trigger) {
      queueMicrotask(() => setVisible(false))
      return
    }

    const target = trigger.getBoundingClientRect()
    const x = target.left + target.width / 2
    const y = target.top + target.height / 2
    const reduced = prefersReducedMotion()

    const coverAnimation = cover.animate(
      reduced
        ? [{ opacity: 1 }, { opacity: 0 }]
        : [{ transform: 'translateY(0)' }, { transform: 'translateY(-100%)' }],
      reduced
        ? { duration: 180, easing: 'linear', fill: 'forwards' }
        : { delay: 950, duration: 1300, easing: 'cubic-bezier(.76, 0, .24, 1)', fill: 'forwards' },
    )

    const markAnimation = mark.animate(
      reduced
        ? [{ opacity: 1 }, { opacity: 0 }]
        : [
            { left: '50vw', top: '50vh', transform: 'translate(-50%, -50%) scale(1.45)', opacity: 1 },
            { left: `${x}px`, top: `${y}px`, transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: 0.82 },
            { left: `${x}px`, top: `${y}px`, transform: 'translate(-50%, -50%) scale(1)', opacity: 0 },
          ],
      reduced
        ? { duration: 160, easing: 'linear', fill: 'forwards' }
        : { delay: 650, duration: 1750, easing: 'cubic-bezier(.76, 0, .24, 1)', fill: 'forwards' },
    )

    const finish = () => {
      playedInThisDocument = true
      setVisible(false)
    }
    Promise.allSettled([coverAnimation.finished, markAnimation.finished]).then(finish)

    return () => {
      coverAnimation.cancel()
      markAnimation.cancel()
    }
  }, [])

  if (!visible) return null

  return (
    <div className={styles.root} data-splash-screen aria-hidden="true">
      <div ref={coverRef} className={styles.cover} />
      <div ref={markRef} className={styles.mark}>{dict.site.name}</div>
    </div>
  )
}
