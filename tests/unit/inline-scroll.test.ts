import { describe, expect, it } from 'vitest'
import { currentPanelIndex, getLogical, getMax, panelStarts, panelStops, setLogical } from '@/lib/inline-scroll'

/**
 * Builds a fake strip: a 1000px-wide viewport onto content of `widths` laid out in reading
 * order with `gap` between panels, starting `lead` px from the inline-start edge. Geometry is
 * computed the way a browser reports it, including RTL's negative scrollLeft.
 */
function fakeStrip(dir: 'ltr' | 'rtl', widths: number[], lead = 300, gap = 80, viewport = 1000) {
  const total = lead + widths.reduce((a, w) => a + w, 0) + gap * (widths.length - 1) + 200
  // Content offsets measured from the start edge.
  const starts: number[] = []
  let x = lead
  for (const w of widths) {
    starts.push(x)
    x += w + gap
  }
  const el = { scrollLeft: 0, scrollWidth: total, clientWidth: viewport } as unknown as HTMLElement & { scrollLeft: number }
  const rect = (i: number) => {
    const logical = Math.abs(el.scrollLeft)
    if (dir === 'ltr') {
      const left = starts[i] - logical
      return { left, right: left + widths[i] }
    }
    const right = viewport - starts[i] + logical
    return { left: right - widths[i], right }
  }
  Object.assign(el, {
    getBoundingClientRect: () => ({ left: 0, right: viewport }),
    querySelectorAll: () => widths.map((_, i) => ({ getBoundingClientRect: () => rect(i) })),
  })
  return { el, starts, total }
}

describe('inline scroll maths (direction-agnostic logical positions)', () => {
  it('reads the same panel starts in LTR and RTL', () => {
    const widths = [600, 300, 500, 400]
    const ltr = fakeStrip('ltr', widths)
    const rtl = fakeStrip('rtl', widths)
    expect(panelStarts(ltr.el, 'ltr')).toEqual(ltr.starts)
    expect(panelStarts(rtl.el, 'rtl')).toEqual(rtl.starts)
  })

  it('stays consistent after the strip has scrolled (RTL uses negative scrollLeft)', () => {
    const widths = [600, 300, 500, 400]
    for (const dir of ['ltr', 'rtl'] as const) {
      const { el, starts } = fakeStrip(dir, widths)
      setLogical(el, dir, 420)
      expect(el.scrollLeft).toBe(dir === 'rtl' ? -420 : 420)
      expect(getLogical(el)).toBe(420)
      expect(panelStarts(el, dir)).toEqual(starts)
    }
  })

  it('clamps to [0, max] in both directions', () => {
    for (const dir of ['ltr', 'rtl'] as const) {
      const { el, total } = fakeStrip(dir, [600, 300])
      setLogical(el, dir, 99999)
      expect(getLogical(el)).toBe(total - 1000)
      expect(getMax(el)).toBe(total - 1000)
      setLogical(el, dir, -50)
      expect(getLogical(el)).toBe(0)
    }
  })

  it('gives identical stops and current index in LTR and RTL', () => {
    const widths = [600, 300, 500, 400, 250]
    const a = fakeStrip('ltr', widths)
    const b = fakeStrip('rtl', widths)
    const stopsA = panelStops(a.el, 'ltr', 60)
    const stopsB = panelStops(b.el, 'rtl', 60)
    expect(stopsB).toEqual(stopsA)
    expect(stopsA[0]).toBe(0) // the hero rests at the start
    for (let i = 1; i < stopsA.length; i++) expect(stopsA[i]).toBeGreaterThanOrEqual(stopsA[i - 1])
    expect(Math.max(...stopsA)).toBeLessThanOrEqual(getMax(a.el))
    expect(currentPanelIndex(stopsA, 0)).toBe(0)
    expect(currentPanelIndex(stopsA, stopsA[2])).toBe(2)
    expect(currentPanelIndex(stopsA, getMax(a.el))).toBe(stopsA.lastIndexOf(Math.max(...stopsA)))
  })
})
