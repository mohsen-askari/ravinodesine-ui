import gsap from 'gsap'
import type { Direction } from '@/i18n/config'

/**
 * Transition engine for the project overview <-> open project.
 *
 * Model (observed on the reference, re-implemented here): opening a project does NOT swap
 * pages. The selected row grows in place — the hero image gets larger, the metadata column
 * and the horizontal strip appear, the other rows are pushed away. The selected image is
 * therefore the same DOM node before, during and after the transition, which is what makes
 * the motion continuous (no cloned images, no cross-fade between two different pictures).
 *
 * Mechanics:
 *  - Each row owns one number, `p` (0 closed .. 1 open), written to the CSS variable `--p`.
 *    The stylesheet derives row height, hero width and the strip's lead-in from it with calc(),
 *    so geometry is always a pure function of `p`: reversible, interruptible, no stored sizes.
 *  - While rows resize, the selected row would drift on screen. Every frame the engine measures
 *    the row and nudges window scroll so it follows a prescribed path (current position ->
 *    resting position). That is the whole "FLIP" job, done continuously.
 *  - Strip content (metadata, panels) is revealed by GSAP, opacity/transform only, after the
 *    geometry has mostly arrived.
 *
 * One timeline is alive at a time. `go()` always kills the previous one first, and never resets
 * state to a "start" value: new tweens begin from wherever `p` currently is.
 */

export type Phase = 'overview' | 'entering' | 'active' | 'exiting'

export const MOTION = {
  open: 1.0,
  close: 0.8,
  /** Used when the target row is far from the viewport; gives the scroll time to travel. */
  openFar: 1.35,
  ease: 'power3.inOut',
  revealDelay: 0.5,
} as const

interface Options {
  dir: Direction
  headerHeight: () => number
  reducedMotion: () => boolean
  onPhase: (phase: Phase) => void
  onSettled: (openSlug: string | null) => void
  /** Called before geometry starts changing (e.g. to reset the scroll-velocity zoom). */
  onBegin?: () => void
}

interface RowState {
  p: number
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function layoutTop(el: HTMLElement): number {
  let y = 0
  let node: HTMLElement | null = el
  while (node) {
    y += node.offsetTop
    node = node.offsetParent as HTMLElement | null
  }
  return y
}

export class Choreographer {
  private rows = new Map<string, RowState>()
  private timeline: gsap.core.Timeline | null = null
  private anchorCancelled = false
  private openSlug: string | null = null
  /** Where the overview was before the first open, so Close can put the reader back. */
  private restore: { scrollY: number; settledScrollY: number } | null = null
  private opts: Options
  busy = false

  constructor(opts: Options) {
    this.opts = opts
  }

  // ---------------------------------------------------------------- DOM access
  private rowEl(slug: string): HTMLElement | null {
    return document.querySelector<HTMLElement>(`[data-row="${CSS.escape(slug)}"]`)
  }
  private scroller(row: HTMLElement): HTMLElement {
    return row.querySelector<HTMLElement>('[data-scroller]') as HTMLElement
  }
  private content(row: HTMLElement): HTMLElement[] {
    return [...row.querySelectorAll<HTMLElement>('[data-reveal]')]
  }
  private state(slug: string): RowState {
    let s = this.rows.get(slug)
    if (!s) {
      const el = this.rowEl(slug)
      const initial = el ? parseFloat(el.style.getPropertyValue('--p')) : 0
      s = { p: Number.isFinite(initial) ? initial : 0 }
      this.rows.set(slug, s)
    }
    return s
  }
  private apply(slug: string) {
    const el = this.rowEl(slug)
    if (!el) return
    const { p } = this.state(slug)
    el.style.setProperty('--p', p.toFixed(4))
    el.dataset.open = p > 0.5 ? 'true' : 'false'
  }

  /** Temporarily sets every row to its final `p`, runs `measure`, then puts things back. */
  private measureFinal<T>(finals: Record<string, number>, measure: () => T): T {
    const savedScroll = window.scrollY
    for (const slug of this.rows.keys()) {
      this.rowEl(slug)?.style.setProperty('--p', (finals[slug] ?? 0).toFixed(4))
    }
    const result = measure()
    for (const slug of this.rows.keys()) this.apply(slug)
    // Shrinking the document while measuring can clamp scroll; put it back.
    if (window.scrollY !== savedScroll) window.scrollTo({ top: savedScroll, behavior: 'instant' })
    return result
  }

  // ---------------------------------------------------------------- public API
  get active(): string | null {
    return this.openSlug
  }

  /** Called once on mount. Rows rendered open (direct URL) are placed without animation. */
  init(slug: string | null, { place = true }: { place?: boolean } = {}) {
    this.rows.clear()
    for (const el of document.querySelectorAll<HTMLElement>('[data-row]')) {
      const s = el.dataset.row as string
      this.state(s).p = s === slug ? 1 : 0
      this.apply(s)
    }
    this.openSlug = slug
    this.opts.onPhase(slug ? 'active' : 'overview')
    if (slug && place) {
      const row = this.rowEl(slug)
      if (row) this.placeRow(row, this.openTop(row))
    }
  }

  /** Brings the app to "slug is open" (or nothing open) from wherever it currently is. */
  go(target: string | null) {
    if (target === this.openSlug && !this.timeline?.isActive()) return
    this.timeline?.kill()
    this.timeline = null
    this.anchorCancelled = false
    this.opts.onBegin?.()

    const reduced = this.opts.reducedMotion()
    const dir = this.opts.dir === 'rtl' ? -1 : 1
    const previous = this.openSlug
    this.openSlug = target

    // Every row that has any openness and is not the target must close.
    const closing = [...this.rows.entries()].filter(([s, st]) => s !== target && st.p > 0.002).map(([s]) => s)
    const targetRow = target ? this.rowEl(target) : null
    if (target && !targetRow) {
      this.settle(null)
      return
    }
    if (!target && closing.length === 0) {
      this.settle(null)
      return
    }

    const entering = !!target
    this.opts.onPhase(entering ? 'entering' : 'exiting')
    this.busy = true

    // ------- where the focus row is now and where it should end up (viewport coordinates)
    const anchorSlug = target ?? closing[0]
    const anchorRow = this.rowEl(anchorSlug)
    const anchorScroller = anchorRow ? this.scroller(anchorRow) : null
    const top0 = anchorScroller ? anchorScroller.getBoundingClientRect().top : 0
    let top1 = top0
    if (anchorRow && anchorScroller) {
      if (target) {
        top1 = this.openTop(anchorRow)
        if (!previous && !this.restore) this.restore = { scrollY: window.scrollY, settledScrollY: window.scrollY }
      } else if (this.restore) {
        const moved = Math.abs(window.scrollY - this.restore.settledScrollY) > window.innerHeight * 0.6
        if (!moved) {
          const finalDocTop = this.measureFinal({}, () => layoutTop(anchorScroller))
          top1 = finalDocTop - this.restore.scrollY
        }
      }
    }
    const focusState = this.state(anchorSlug)
    const p0 = focusState.p
    const far = Math.abs(top0 - top1) > window.innerHeight * 0.9
    const openDur = reduced ? 0 : far ? MOTION.openFar : MOTION.open
    const closeDur = reduced ? 0 : MOTION.close

    const tl = gsap.timeline({ onComplete: () => this.finish(target) })
    this.timeline = tl

    const anchorFrame = (u: number) => {
      if (this.anchorCancelled || !anchorScroller) return
      const wanted = lerp(top0, top1, u)
      const delta = anchorScroller.getBoundingClientRect().top - wanted
      if (Math.abs(delta) > 0.05) window.scrollTo({ top: window.scrollY + delta, behavior: 'instant' })
    }

    // ------- closing rows
    for (const slug of closing) {
      const st = this.state(slug)
      const el = this.rowEl(slug)
      if (!el) continue
      const items = this.content(el)
      if (items.length) tl.to(items, { autoAlpha: 0, duration: reduced ? 0.15 : 0.28, ease: 'power1.in', overwrite: true }, 0)
      const isFocus = !target && slug === anchorSlug
      tl.to(
        st,
        {
          p: 0,
          duration: closeDur,
          ease: MOTION.ease,
          onUpdate: () => {
            this.apply(slug)
            if (isFocus) anchorFrame(p0 === 0 ? 1 : 1 - st.p / p0)
          },
          onComplete: () => this.apply(slug),
        },
        reduced ? 0 : 0.1,
      )
    }

    // ------- opening row
    if (target && targetRow) {
      const st = this.state(target)
      const items = this.content(targetRow)
      // Panels are mounted by React in the same commit that changed the URL; hide them before
      // the first paint so nothing shows ahead of the geometry.
      gsap.set(items, { autoAlpha: 0 })
      tl.to(
        st,
        {
          p: 1,
          duration: openDur,
          ease: MOTION.ease,
          onUpdate: () => {
            this.apply(target)
            anchorFrame(p0 >= 1 ? 1 : (st.p - p0) / (1 - p0))
          },
          onComplete: () => this.apply(target),
        },
        0,
      )
      const meta = items.filter((n) => n.dataset.reveal === 'meta')
      const panels = items.filter((n) => n.dataset.reveal === 'panel')
      const at = reduced ? 0 : openDur * MOTION.revealDelay
      if (reduced) {
        tl.to(items, { autoAlpha: 1, duration: 0.25, ease: 'power1.out' }, 0)
      } else {
        // Content appears along the reading direction: from inline-end toward inline-start.
        tl.fromTo(meta, { autoAlpha: 0, x: 14 * dir }, { autoAlpha: 1, x: 0, duration: 0.6, ease: 'power2.out' }, at)
        const lead = panels.slice(0, 6)
        const rest = panels.slice(6)
        tl.fromTo(
          lead,
          { autoAlpha: 0, x: 64 * dir },
          { autoAlpha: 1, x: 0, duration: 0.85, ease: 'power3.out', stagger: 0.09 },
          at + 0.05,
        )
        if (rest.length) tl.set(rest, { autoAlpha: 1 }, at)
      }
    }

    if (reduced) {
      // Make sure the timeline completes on the next tick even if it has no tweened time.
      tl.set({}, {}, 0.01)
    }
  }

  /** The reader started scrolling mid-transition: stop steering the page. */
  cancelAnchor() {
    this.anchorCancelled = true
  }

  recordSettledScroll() {
    if (this.restore) this.restore.settledScrollY = window.scrollY
  }

  destroy() {
    this.timeline?.kill()
    this.timeline = null
    this.busy = false
  }

  // ---------------------------------------------------------------- internals
  private openTop(row: HTMLElement): number {
    const scroller = this.scroller(row)
    const slug = row.dataset.row as string
    const height = this.measureFinal({ [slug]: 1 }, () => scroller.offsetHeight)
    const header = this.opts.headerHeight()
    const free = window.innerHeight - header
    return header + Math.max(16, (free - height) / 2)
  }

  /** Instantly scrolls so `row`'s scroller sits at viewport `top`. */
  private placeRow(row: HTMLElement, top: number) {
    const scroller = this.scroller(row)
    const delta = scroller.getBoundingClientRect().top - top
    window.scrollTo({ top: window.scrollY + delta, behavior: 'instant' })
  }

  private finish(target: string | null) {
    this.timeline = null
    // Clear transient inline styles on the open row so settled content is plain CSS again.
    // Closed rows keep their faded panels: React unmounts them right after settle, and clearing
    // would flash them back in for a frame.
    for (const slug of this.rows.keys()) {
      const el = this.rowEl(slug)
      if (!el) continue
      if (slug === target) gsap.set(this.content(el), { clearProps: 'opacity,visibility,transform' })
      this.apply(slug)
    }
    if (!target) this.restore = null
    this.settle(target)
  }

  private settle(target: string | null) {
    this.busy = false
    this.openSlug = target
    if (target) this.recordSettledScroll()
    this.opts.onPhase(target ? 'active' : 'overview')
    this.opts.onSettled(target)
  }
}
