import type { Direction } from '@/i18n/config'

// The horizontal strip follows the reading direction: it starts at the inline-start edge and
// progresses toward inline-end. Browsers report scrollLeft as 0 at the start and *negative*
// toward the end in RTL. Everything in the experience therefore works with a "logical"
// position: 0 = start, max = end, regardless of direction. Only this file touches scrollLeft.

/** +1 when content flows to the right (LTR), -1 when it flows to the left (RTL). */
export const flowSign = (dir: Direction): 1 | -1 => (dir === 'rtl' ? -1 : 1)

export const getMax = (el: HTMLElement): number => Math.max(0, el.scrollWidth - el.clientWidth)

export const getLogical = (el: HTMLElement): number => Math.abs(el.scrollLeft)

export function setLogical(el: HTMLElement, dir: Direction, value: number): void {
  const v = Math.min(Math.max(value, 0), getMax(el))
  el.scrollLeft = dir === 'rtl' ? -v : v
}

/** Distance of each [data-panel]'s inline-start edge from the start of the scrollable content. */
export function panelStarts(scroller: HTMLElement, dir: Direction): number[] {
  const sr = scroller.getBoundingClientRect()
  const logical = getLogical(scroller)
  return [...scroller.querySelectorAll<HTMLElement>('[data-panel]')].map((el) => {
    const r = el.getBoundingClientRect()
    return (dir === 'rtl' ? sr.right - r.right : r.left - sr.left) + logical
  })
}

/**
 * Scroll positions that bring each panel to the strip's reading margin. The first panel (the
 * hero) rests at 0; the rest sit `margin` px in from the inline-start edge.
 */
export function panelStops(scroller: HTMLElement, dir: Direction, margin: number): number[] {
  const max = getMax(scroller)
  return panelStarts(scroller, dir).map((start, i) => (i === 0 ? 0 : Math.min(Math.max(start - margin, 0), max)))
}

/** Index of the panel whose stop is the last one at or before the current position. */
export function currentPanelIndex(stops: number[], logical: number): number {
  let index = 0
  for (let i = 0; i < stops.length; i++) if (stops[i] <= logical + 6) index = i
  return index
}
