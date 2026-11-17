'use client'

import gsap from 'gsap'
import { useCallback, useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import type { Direction } from '@/i18n/config'
import { flowSign, getLogical, getMax, panelStops, setLogical } from '@/lib/inline-scroll'

/**
 * Input for the open project's horizontal strip.
 *
 * Native overflow scrolling stays the engine: touch swipes, trackpad deltaX, Shift+wheel,
 * scrollbar and focus scrolling are all untouched. On top of it this hook adds:
 *  - mouse-wheel -> horizontal movement, ONLY while the pointer is over the open strip, only
 *    for wheel-like events (not trackpad gestures), and only while the strip can still move in
 *    that direction — at either end the wheel falls through to the page, so there are no dead ends;
 *  - mouse drag-to-scroll (mouse pointers only; touch already pans natively);
 *  - keyboard: arrows follow the reading direction, Home/End jump, Esc closes;
 *  - panel-by-panel stepping for the visible controls.
 *
 * No global wheel listener: handlers are attached to the one active scroller.
 */
interface Params {
  /** Element containing the project rows. */
  root: RefObject<HTMLElement | null>
  /** Slug of the open project (its strip is the one controlled), or null. */
  slug: string | null
  dir: Direction
  active: boolean
  onClose: () => void
}

const READING_MARGIN = () => Math.min(window.innerWidth * 0.06, 96)

function isEditable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el || !el.tagName) return false
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
}

export function useStripInput({ root, slug, dir, active, onClose }: Params) {
  const tween = useRef<gsap.core.Tween | null>(null)
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  /** The open row's scroller, looked up when needed so it can never be stale. */
  const getScroller = useCallback((): HTMLElement | null => {
    if (!slug) return null
    return root.current?.querySelector<HTMLElement>(`[data-row="${CSS.escape(slug)}"] [data-scroller]`) ?? null
  }, [root, slug])

  const stop = useCallback(() => {
    tween.current?.kill()
    tween.current = null
  }, [])

  const scrollTo = useCallback(
    (to: number, reduced = false) => {
      const scroller = getScroller()
      if (!scroller) return
      stop()
      const target = Math.min(Math.max(to, 0), getMax(scroller))
      if (reduced) {
        setLogical(scroller, dir, target)
        return
      }
      const proxy = { v: getLogical(scroller) }
      tween.current = gsap.to(proxy, {
        v: target,
        duration: Math.min(0.9, 0.35 + Math.abs(target - proxy.v) / 2400),
        ease: 'power3.out',
        onUpdate: () => setLogical(scroller, dir, proxy.v),
        onComplete: () => {
          tween.current = null
        },
      })
    },
    [getScroller, dir, stop],
  )

  /** Step to the next/previous panel in reading order. */
  const step = useCallback(
    (delta: 1 | -1) => {
      const scroller = getScroller()
      if (!scroller) return
      const stops = panelStops(scroller, dir, READING_MARGIN())
      const here = getLogical(scroller)
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (delta > 0) {
        const next = stops.find((s) => s > here + 8)
        scrollTo(next ?? getMax(scroller), reduced)
      } else {
        const prev = [...stops].reverse().find((s) => s < here - 8)
        scrollTo(prev ?? 0, reduced)
      }
    },
    [getScroller, dir, scrollTo],
  )

  const jump = useCallback(
    (to: 'start' | 'end') => {
      const scroller = getScroller()
      if (!scroller) return
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      scrollTo(to === 'start' ? 0 : getMax(scroller), reduced)
    },
    [getScroller, scrollTo],
  )

  // ---- wheel, drag
  useEffect(() => {
    const scroller = getScroller()
    if (!scroller || !active) return
    const sign = flowSign(dir)
    let target: number | null = null
    let raf = 0
    let lastHorizontal = 0

    const tick = () => {
      raf = 0
      if (target === null) return
      const cur = getLogical(scroller)
      const diff = target - cur
      if (Math.abs(diff) < 0.5) {
        setLogical(scroller, dir, target)
        target = null
        return
      }
      setLogical(scroller, dir, cur + diff * 0.2)
      raf = requestAnimationFrame(tick)
    }
    const cancelSmoothing = () => {
      target = null
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) return // pinch-zoom / browser zoom
      if (e.deltaX !== 0) lastHorizontal = performance.now()
      const vertical = Math.abs(e.deltaY) > Math.abs(e.deltaX)
      if (!vertical) return // native horizontal scrolling (trackpad, Shift+wheel on most platforms)
      if (performance.now() - lastHorizontal < 250) return // a trackpad swipe drifting diagonal
      if (e.shiftKey) return
      // Wheel-like: line-mode, or large coarse notches. Trackpads send many small deltas.
      const wheelLike = e.deltaMode === 1 || (Math.abs(e.deltaY) >= 50 && Number.isInteger(e.deltaY))
      if (!wheelLike) return

      const px = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY
      const max = getMax(scroller)
      const cur = target ?? getLogical(scroller)
      // Falls through to the page at either end.
      if ((px > 0 && cur >= max - 1) || (px < 0 && cur <= 1)) return
      e.preventDefault()
      stop()
      target = Math.min(Math.max(cur + px * 1.1, 0), max)
      if (!raf) raf = requestAnimationFrame(tick)
    }

    // Drag to scroll (mouse only; touch scrolls natively).
    let dragging = false
    let moved = false
    let startX = 0
    let startLogical = 0
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return
      if ((e.target as HTMLElement).closest('button, input, [data-nodrag]')) return
      cancelSmoothing()
      stop()
      dragging = true
      moved = false
      startX = e.clientX
      startLogical = getLogical(scroller)
    }
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return
      const dx = e.clientX - startX
      if (!moved && Math.abs(dx) < 6) return
      if (!moved) {
        moved = true
        scroller.dataset.dragging = 'true'
        getSelection()?.removeAllRanges()
      }
      // Dragging toward the start moves forward through the story, so the sign follows flow.
      setLogical(scroller, dir, startLogical - dx * sign)
    }
    const end = () => {
      if (!dragging) return
      dragging = false
      delete scroller.dataset.dragging
      if (moved) {
        // Swallow the click that ends a drag so it cannot open a link underneath.
        const swallow = (ev: Event) => {
          ev.preventDefault()
          ev.stopPropagation()
        }
        scroller.addEventListener('click', swallow, { capture: true, once: true })
        window.setTimeout(() => scroller.removeEventListener('click', swallow, { capture: true }), 0)
      }
    }
    const onUserScroll = () => {
      cancelSmoothing()
      stop()
    }

    scroller.addEventListener('wheel', onWheel, { passive: false })
    scroller.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    scroller.addEventListener('touchstart', onUserScroll, { passive: true })
    return () => {
      scroller.removeEventListener('wheel', onWheel)
      scroller.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      scroller.removeEventListener('touchstart', onUserScroll)
      cancelSmoothing()
      stop()
    }
  }, [getScroller, dir, active, stop])

  // ---- keyboard
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
      if (isEditable(e.target) || document.body.dataset.menuOpen) return
      const forward = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
      const backward = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft'
      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          closeRef.current()
          break
        case forward:
          e.preventDefault()
          step(1)
          break
        case backward:
          e.preventDefault()
          step(-1)
          break
        case 'Home':
          // Page Home/End stay native unless focus is inside the strip.
          if (e.shiftKey || !getScroller()?.contains(e.target as Node)) return
          e.preventDefault()
          jump('start')
          break
        case 'End':
          if (e.shiftKey || !getScroller()?.contains(e.target as Node)) return
          e.preventDefault()
          jump('end')
          break
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [active, dir, getScroller, step, jump])

  return { step }
}
