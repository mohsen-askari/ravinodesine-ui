'use client'

import { forwardRef } from 'react'
import { ArrowIcon, CloseIcon } from '@/components/Icons'
import { useI18n } from '@/i18n/context'
import { formatNumber } from '@/i18n/format'
import { t } from '@/i18n/dictionary'
import styles from './experience.module.css'

interface Props {
  visible: boolean
  index: number
  count: number
  onClose: () => void
  onStep: (delta: 1 | -1) => void
}

/** Close, panel counter + progress rule, previous/next. "Next" follows the reading direction. */
export const StripControls = forwardRef<HTMLDivElement, Props>(function StripControls({ visible, index, count, onClose, onStep }, ref) {
  const { locale, dict } = useI18n()
  return (
    <div ref={ref} className={styles.controls} hidden={!visible} role="group" aria-label={dict.project.progressLabel} data-controls>
      <button type="button" className={styles.close} onClick={onClose}>
        <CloseIcon />
        <span>{dict.project.close}</span>
        <kbd className={styles.kbd}>{dict.project.closeHint}</kbd>
      </button>

      <div className={styles.progress}>
        <div className={styles.rule} aria-hidden="true">
          <div className={styles.bar} />
        </div>
        <span className={styles.count} aria-live="off">
          {count > 0 ? t(dict.project.progress, { current: formatNumber(locale, index + 1), total: formatNumber(locale, count) }) : ''}
        </span>
      </div>

      <div className={styles.stepper}>
        <button type="button" className={`${styles.step} ${styles.prev}`} onClick={() => onStep(-1)} disabled={index <= 0} aria-label={dict.project.previous}>
          <ArrowIcon />
        </button>
        <button type="button" className={`${styles.step} ${styles.next}`} onClick={() => onStep(1)} disabled={count > 0 && index >= count - 1} aria-label={dict.project.next}>
          <ArrowIcon />
        </button>
      </div>
    </div>
  )
})
