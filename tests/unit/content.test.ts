import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { projects } from '@/content/projects'
import { localizeProjects } from '@/content/localize'
import type { Localized, Panel } from '@/content/types'
import { locales } from '@/i18n/config'

const ARABIC_SCRIPT = /[؀-ۿ]/
const publicDir = path.resolve(__dirname, '../../public')

function allLocalized(project: (typeof projects)[number]): [string, Localized<unknown>][] {
  const out: [string, Localized<unknown>][] = [
    ['title', project.title],
    ['location', project.location],
    ['client', project.client],
    ['shortDescription', project.shortDescription],
    ['description', project.description],
  ]
  project.facts.forEach((f, i) => out.push([`facts[${i}].label`, f.label], [`facts[${i}].value`, f.value]))
  project.panels.forEach((p: Panel, i) => {
    const k = `panels[${i}](${p.type})`
    if (p.type === 'intro') out.push([`${k}.body`, p.body], ...(p.heading ? ([[`${k}.heading`, p.heading]] as [string, Localized<unknown>][]) : []))
    if (p.type === 'image') out.push([`${k}.alt`, p.image.alt], ...(p.caption ? ([[`${k}.caption`, p.caption]] as [string, Localized<unknown>][]) : []))
    if (p.type === 'imagePair') p.images.forEach((im, j) => out.push([`${k}.alt${j}`, im.alt]))
    if (p.type === 'quote') out.push([`${k}.text`, p.text], [`${k}.attribution`, p.attribution])
    if (p.type === 'diagram') out.push([`${k}.alt`, p.image.alt], [`${k}.caption`, p.caption])
    if (p.type === 'facts') out.push([`${k}.heading`, p.heading], ...p.items.flatMap((f, j) => [[`${k}.items[${j}].label`, f.label], [`${k}.items[${j}].value`, f.value]] as [string, Localized<unknown>][]))
    if (p.type === 'context') out.push([`${k}.heading`, p.heading], [`${k}.body`, p.body])
    if (p.type === 'credits') p.groups.forEach((g, j) => out.push([`${k}.groups[${j}].role`, g.role], [`${k}.groups[${j}].names`, g.names]))
  })
  out.push(['hero.alt', project.hero.alt])
  return out
}

describe('project content model', () => {
  it('has unique ids and slugs', () => {
    expect(new Set(projects.map((p) => p.id)).size).toBe(projects.length)
    expect(new Set(projects.map((p) => p.slug)).size).toBe(projects.length)
    for (const p of projects) expect(p.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it.each(projects.map((p) => [p.slug, p] as const))('%s: every localized field exists in every locale', (_slug, project) => {
    for (const [name, value] of allLocalized(project)) {
      for (const locale of locales) {
        const v = value[locale]
        expect(v, `${name} [${locale}]`).toBeDefined()
        if (typeof v === 'string') expect(v.trim().length, `${name} [${locale}] is empty`).toBeGreaterThan(0)
        if (Array.isArray(v)) {
          expect(v.length, `${name} [${locale}] is empty`).toBeGreaterThan(0)
          for (const item of v) expect(String(item).trim().length).toBeGreaterThan(0)
        }
      }
    }
  })

  it.each(projects.map((p) => [p.slug, p] as const))('%s: Persian titles/descriptions are written in Persian script', (_slug, p) => {
    expect(p.title.fa).toMatch(ARABIC_SCRIPT)
    expect(p.shortDescription.fa).toMatch(ARABIC_SCRIPT)
    expect(p.location.fa).toMatch(ARABIC_SCRIPT)
    for (const para of p.description.fa) expect(para).toMatch(ARABIC_SCRIPT)
    // ...and English fields are not accidentally Persian.
    expect(p.title.en).not.toMatch(ARABIC_SCRIPT)
  })

  it.each(projects.map((p) => [p.slug, p] as const))('%s: images are in the manifest and on disk, with real dimensions', (_slug, p) => {
    const assets = [p.hero, p.thumbnail]
    for (const panel of p.panels) {
      if (panel.type === 'image' || panel.type === 'diagram') assets.push(panel.image)
      if (panel.type === 'imagePair') assets.push(...panel.images)
    }
    for (const a of assets) {
      expect(existsSync(path.join(publicDir, a.src)), a.src).toBe(true)
      expect(a.width).toBeGreaterThan(0)
      expect(a.height).toBeGreaterThan(0)
      expect(a.blurDataURL.startsWith('data:image/')).toBe(true)
      expect(a.tone).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it.each(projects.map((p) => [p.slug, p] as const))('%s: related projects exist, are not self, and match the related panel', (_slug, p) => {
    const slugs = new Set(projects.map((x) => x.slug))
    expect(p.related.length).toBeGreaterThan(0)
    for (const r of p.related) {
      expect(slugs.has(r), `unknown related slug ${r}`).toBe(true)
      expect(r).not.toBe(p.slug)
    }
    const panel = p.panels.find((x) => x.type === 'related')
    expect(panel && panel.type === 'related' ? panel.slugs : []).toEqual(p.related)
  })

  it.each(projects.map((p) => [p.slug, p] as const))('%s: the narrative has the structure the experience relies on', (_slug, p) => {
    const types = p.panels.map((x) => x.type)
    expect(types.at(-1)).toBe('related') // the story ends with a way onward
    expect(types).toContain('credits')
    expect(types).toContain('quote')
    expect(types.filter((t) => t === 'image' || t === 'imagePair' || t === 'diagram').length).toBeGreaterThanOrEqual(3)
  })

  it('localized views have identical panel structure in every locale (content order is semantically stable)', () => {
    const [en, fa] = locales.map((l) => localizeProjects(projects, l))
    for (let i = 0; i < projects.length; i++) {
      expect(fa[i].panels.map((p) => p.type)).toEqual(en[i].panels.map((p) => p.type))
      expect(fa[i].panels[0].type).toBe('summary')
      // Image order is the same in both locales: language never reorders photographs.
      const srcs = (v: (typeof en)[number]) => v.panels.flatMap((p) => ('image' in p ? [p.image.src] : 'images' in p ? p.images.map((x) => x.src) : []))
      expect(srcs(fa[i])).toEqual(srcs(en[i]))
    }
  })
})
