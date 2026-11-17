import type { Locale } from '@/i18n/config'
import type { CategoryKey, CreditGroup, Fact, ImageAsset, Localized, Panel, Project, StatusKey, TypologyKey } from './types'

/** Everything below is already resolved to a single locale — safe and small to ship to the client. */
export interface ImageView {
  src: string
  width: number
  height: number
  blurDataURL: string
  tone: string
  alt: string
}
export interface FactView {
  label: string
  value: string
}
export interface CreditView {
  role: string
  names: string[]
}

/** `summary` is derived (short description + full description + facts), never authored. */
export type PanelView =
  | { type: 'summary'; lead: string; body: string[]; facts: FactView[] }
  | { type: 'intro'; heading?: string; body: string[] }
  | { type: 'image'; image: ImageView; shape: 'portrait' | 'landscape' | 'wide' | 'square'; caption?: string }
  | { type: 'imagePair'; images: [ImageView, ImageView]; captions?: [string, string] }
  | { type: 'quote'; text: string; attribution: string }
  | { type: 'diagram'; image: ImageView; caption: string }
  | { type: 'facts'; heading: string; items: FactView[] }
  | { type: 'context'; heading: string; body: string; coordinates: string }
  | { type: 'credits'; groups: CreditView[] }
  | { type: 'related'; slugs: string[] }

export interface ProjectView {
  id: string
  index: number
  slug: string
  category: CategoryKey
  typology: TypologyKey
  status: StatusKey
  year: number
  area: number
  title: string
  location: string
  client: string
  shortDescription: string
  description: string[]
  hero: ImageView
  facts: FactView[]
  panels: PanelView[]
  related: string[]
}

const pick = <T,>(value: Localized<T>, locale: Locale): T => value[locale]

function image(asset: ImageAsset, locale: Locale): ImageView {
  return { src: asset.src, width: asset.width, height: asset.height, blurDataURL: asset.blurDataURL, tone: asset.tone, alt: pick(asset.alt, locale) }
}
const fact = (f: Fact, locale: Locale): FactView => ({ label: pick(f.label, locale), value: pick(f.value, locale) })
const credit = (c: CreditGroup, locale: Locale): CreditView => ({ role: pick(c.role, locale), names: pick(c.names, locale) })

function panel(p: Panel, locale: Locale): PanelView {
  switch (p.type) {
    case 'intro':
      return { type: 'intro', heading: p.heading && pick(p.heading, locale), body: pick(p.body, locale) }
    case 'image':
      return { type: 'image', image: image(p.image, locale), shape: p.shape, caption: p.caption && pick(p.caption, locale) }
    case 'imagePair':
      return {
        type: 'imagePair',
        images: [image(p.images[0], locale), image(p.images[1], locale)],
        captions: p.captions && [pick(p.captions[0], locale), pick(p.captions[1], locale)],
      }
    case 'quote':
      return { type: 'quote', text: pick(p.text, locale), attribution: pick(p.attribution, locale) }
    case 'diagram':
      return { type: 'diagram', image: image(p.image, locale), caption: pick(p.caption, locale) }
    case 'facts':
      return { type: 'facts', heading: pick(p.heading, locale), items: p.items.map((f) => fact(f, locale)) }
    case 'context':
      return { type: 'context', heading: pick(p.heading, locale), body: pick(p.body, locale), coordinates: p.coordinates }
    case 'credits':
      return { type: 'credits', groups: p.groups.map((g) => credit(g, locale)) }
    case 'related':
      return { type: 'related', slugs: p.slugs }
  }
}

export function localizeProject(project: Project, index: number, locale: Locale): ProjectView {
  return {
    id: project.id,
    index,
    slug: project.slug,
    category: project.category,
    typology: project.typology,
    status: project.status,
    year: project.year,
    area: project.area,
    title: pick(project.title, locale),
    location: pick(project.location, locale),
    client: pick(project.client, locale),
    shortDescription: pick(project.shortDescription, locale),
    description: pick(project.description, locale),
    hero: image(project.hero, locale),
    facts: project.facts.map((f) => fact(f, locale)),
    panels: [
      {
        type: 'summary',
        lead: pick(project.shortDescription, locale),
        body: pick(project.description, locale),
        facts: project.facts.map((f) => fact(f, locale)),
      },
      ...project.panels.map((p) => panel(p, locale)),
    ],
    related: project.related,
  }
}

export function localizeProjects(all: Project[], locale: Locale): ProjectView[] {
  return all.map((p, i) => localizeProject(p, i, locale))
}
