/* eslint-disable @typescript-eslint/no-explicit-any -- the tests edit JSON fixtures of a shape they deliberately break */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ContentApiError, mapProject, mapProjects } from '@/content/api'
import { localizeProjects } from '@/content/localize'
import { projects } from '@/content/projects'
import { locales, type Locale } from '@/i18n/config'

const fixture = (name: string): Record<string, any> => JSON.parse(readFileSync(path.resolve(__dirname, '../fixtures/api', `${name}.json`), 'utf8'))

/** The one thing that differs between the seeded backend and the static dataset: where the pixels live. */
function withoutPixels(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutPixels)
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>
    if ('blurDataURL' in o && 'tone' in o) return { alt: o.alt }
    return Object.fromEntries(Object.entries(o).filter(([k]) => k !== 'id').map(([k, v]) => [k, withoutPixels(v)]))
  }
  return value
}

afterEach(() => vi.restoreAllMocks())

describe.each(locales)('API fixtures (%s) → the views the UI renders', (locale: Locale) => {
  const mapped = mapProjects(fixture(`projects-${locale}`), locale)
  const expected = localizeProjects(projects, locale)

  it('has the eight projects of the dataset the backend was seeded from, in the same order', () => {
    expect(mapped.map((p) => p.slug)).toEqual(expected.map((p) => p.slug))
  })

  it('maps to exactly what the static content produced (texts, facts, panels, order), apart from image pixels and ids', () => {
    expect(withoutPixels(mapped)).toEqual(withoutPixels(expected))
  })

  it('keeps every image usable by next/image: absolute address, size, blur placeholder and tone', () => {
    const images = JSON.stringify(mapped).match(/"src":"[^"]+"/g) ?? []
    expect(images.length).toBeGreaterThan(40)
    for (const src of images) expect(src).toMatch(/^"src":"https:\/\/cms\.ravino\.test\/storage\//)
    for (const project of mapped) {
      expect(project.hero.width).toBeGreaterThan(0)
      expect(project.hero.blurDataURL).toMatch(/^data:image\//)
      expect(project.hero.tone).toMatch(/^#[0-9a-f]{6}$/)
      expect(project.hero.alt.length).toBeGreaterThan(0)
    }
  })

  it('puts the derived summary panel first and never takes it from the API', () => {
    for (const project of mapped) {
      expect(project.panels[0]).toEqual({ type: 'summary', lead: project.shortDescription, body: project.description, facts: project.facts })
      expect(project.panels.filter((p) => p.type === 'summary')).toHaveLength(1)
    }
  })
})

describe('mapProject on unusual but valid input', () => {
  const base = () => structuredClone(fixture('projects-en').data[0])

  it('treats a missing client (null) as no client', () => {
    expect(mapProject({ ...base(), client: null }).client).toBe('')
  })

  it('keeps a category or typology the UI has no label for, and says so', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const view = mapProject({ ...base(), category: { key: 'furniture', name: 'Furniture' } })
    expect(view.category).toBe('furniture')
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"furniture" has no label'))
  })

  it('leaves out a panel type this version of the UI does not know instead of failing the project', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const project = base()
    const before = project.panels.length
    project.panels.splice(1, 0, { type: 'timeline', steps: [] })
    expect(mapProject(project).panels).toHaveLength(before + 1) // + summary, − unknown
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('unknown panel type "timeline"'))
  })

  it('accepts a project with no story', () => {
    expect(mapProject({ ...base(), panels: [] }).panels).toHaveLength(1)
  })

  it.each([
    ['a missing title', (p: any) => delete p.title],
    ['a numeric slug', (p: any) => (p.slug = 5)],
    ['an unknown status', (p: any) => (p.status = 'archived')],
    ['a hero without a blur placeholder', (p: any) => delete p.hero.blurDataURL],
    ['panels that are not a list', (p: any) => (p.panels = {})],
    ['an image pair with one image', (p: any) => p.panels.push({ type: 'imagePair', images: [p.hero] })],
    ['an image with an unknown shape', (p: any) => p.panels.push({ type: 'image', shape: 'tall', image: p.hero })],
    ['a hero address with a script scheme', (p: any) => (p.hero.src = 'javascript:alert(1)')],
    ['a hero address that is a data URL', (p: any) => (p.hero.src = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=')],
    ['a relative hero address', (p: any) => (p.hero.src = '/storage/media/a.jpg')],
    ['a hero address with credentials', (p: any) => (p.hero.src = 'https://user:pass@cms.ravino.test/a.jpg')],
    ['a blur placeholder that is not an image data URL', (p: any) => (p.hero.blurDataURL = 'https://evil.test/a.jpg')],
    ['a blur placeholder that could break out of CSS url()', (p: any) => (p.hero.blurDataURL = 'data:image/jpeg;base64,AAAA");background:red;x:("')],
    ['a tone that is not a colour', (p: any) => (p.hero.tone = 'red; background: url(//evil.test)')],
  ])('rejects %s with a message that names the field', (_name, break_) => {
    const project = base()
    break_(project)
    expect(() => mapProject(project)).toThrow(ContentApiError)
  })

  it('rejects an answer for the wrong locale and one that is not the expected envelope', () => {
    expect(() => mapProjects(fixture('projects-fa'), 'en')).toThrow(/locale/)
    expect(() => mapProjects({ data: [] }, 'en')).toThrow(ContentApiError)
    expect(() => mapProjects(null, 'en')).toThrow(ContentApiError)
    expect(() => mapProjects({ data: 'x', meta: { locale: 'en' } }, 'en')).toThrow(ContentApiError)
  })

  it('accepts an empty list (nothing is published in that language yet)', () => {
    expect(mapProjects({ data: [], meta: { locale: 'fa', total: 0 } }, 'fa')).toEqual([])
  })
})
