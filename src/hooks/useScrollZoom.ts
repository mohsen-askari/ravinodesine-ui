'use client'

import gsap from 'gsap'
import { useEffect } from 'react'
import type { RefObject } from 'react'

/**
 * Overview "zoom-out while scrolling": the stack of projects scales down a little in
 * proportion to scroll speed, then settles back once the reader stops. (The reference does
 * the same; the rest-scale and range here are my own choices.)
 *
 * It is a pure visual layer: transform only, no layout, no wheel interception — scrolling stays
 * native. It is switched off for touch/coarse pointers, for reduced motion, and whenever a
 * project is open or a transition is running.
 */
const MIN_SCALE = 0.88

export function useScrollZoom(target: RefObject<HTMLElement | null>, enabled: boolean, busy: () => boolean) {
  useEffect(() => {
    const el = target.current
    if (!el || !enabled) return
    const mq = window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)')
    if (!mq.matches) return

    const state = { s: 1 }
    const apply = () => {
      el.style.transform = state.s > 0.9995 ? '' : `scale(${state.s.toFixed(4)})`
    }
    const to = gsap.quickTo(state, 's', { duration: 0.55, ease: 'power3.out', onUpdate: apply })
    let lastY = window.scrollY
    let lastT = performance.now()
    let velocity = 0
    let idle: ReturnType<typeof setTimeout> | undefined
    let release: ReturnType<typeof setTimeout> | undefined

    const onScroll = () => {
      const now = performance.now()
      const dy = Math.abs(window.scrollY - lastY)
      const dt = Math.max(1, now - lastT)
      lastY = window.scrollY
      lastT = now
      if (busy()) return
      velocity += (dy / dt - velocity) * 0.35 // px per ms, smoothed
      const k = Math.min(velocity / 3, 1)
      if (k < 0.04) return
      // Zoom around the point the reader is looking at: the middle of the viewport.
      const top = el.getBoundingClientRect().top + window.scrollY
      el.style.transformOrigin = `50% ${window.scrollY + window.innerHeight / 2 - top}px`
      el.style.willChange = 'transform'
      to(1 - (1 - MIN_SCALE) * k)
      clearTimeout(idle)
      clearTimeout(release)
      idle = setTimeout(() => {
        velocity = 0
        to(1)
        release = setTimeout(() => {
          el.style.willChange = ''
          el.style.transformOrigin = ''
        }, 700)
      }, 140)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      clearTimeout(idle)
      clearTimeout(release)
      gsap.killTweensOf(state)
      el.style.transform = ''
      el.style.willChange = ''
      el.style.transformOrigin = ''
    }
  }, [target, enabled, busy])
}

/** Immediately-eased reset used right before a project opens. */
export function resetZoom(el: HTMLElement | null) {
  if (!el) return
  el.style.transition = 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)'
  el.style.transform = ''
  window.setTimeout(() => {
    el.style.transition = ''
    el.style.willChange = ''
    el.style.transformOrigin = ''
  }, 380)
}
