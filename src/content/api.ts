import type { Locale } from '@/i18n/config'
import type { FactView, ImageView, PanelView, ProjectView } from './localize'
import type { CategoryKey, StatusKey, TypologyKey } from './types'

/**
 * Maps the backend's public API (docs/architecture/api-contract.md §2, §3.2, §3.3) to the view types the UI already
 * renders. The API answers for one locale, so there is nothing to localize here; the one thing the UI derives itself
 * is the `summary` panel (it is never sent by the API).
 */

export class ContentApiError extends Error {}

const STATUSES: readonly string[] = ['concept', 'design', 'construction', 'completed']
const PANEL_TYPES: readonly string[] = ['intro', 'image', 'imagePair', 'quote', 'diagram', 'facts', 'context', 'credits', 'related']
const SHAPES: readonly string[] = ['portrait', 'landscape', 'wide', 'square']

/** Terms the UI has labels for (src/i18n/dictionaries). A term the editors add later still works, but is shown unlabelled. */
const KNOWN_CATEGORIES: readonly string[] = ['architecture', 'interiors', 'landscape', 'planning']
const KNOWN_TYPOLOGIES: readonly string[] = ['culture', 'residential', 'hospitality', 'public-space', 'urban', 'science']

type Json = Record<string, unknown>

function fail(path: string, expected: string): never {
  throw new ContentApiError(`Unexpected API response: ${path} should be ${expected}.`)
}
const obj = (v: unknown, path: string): Json => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Json) : fail(path, 'an object'))
const arr = (v: unknown, path: string): unknown[] => (Array.isArray(v) ? v : fail(path, 'a list'))
const str = (v: unknown, path: string): string => (typeof v === 'string' ? v : fail(path, 'a string'))
const num = (v: unknown, path: string): number => (typeof v === 'number' && Number.isFinite(v) ? v : fail(path, 'a number'))
const strs = (v: unknown, path: string): string[] => arr(v, path).map((x, i) => str(x, `${path}[${i}]`))

/** Values that end up in an <img> address, a CSS colour and a CSS background: checked, not trusted. */
const BLUR_PLACEHOLDER = /^data:image\/(?:jpeg|png|webp|avif);base64,[A-Za-z0-9+/]+=*$/
const TONE = /^#[0-9a-fA-F]{6}$/

function imageUrl(v: unknown, path: string): string {
  const value = str(v, path)
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return fail(path, 'an absolute http(s) address')
  }
  if ((url.protocol !== 'https:' && url.protocol !== 'http:') || url.username || url.password) fail(path, 'an absolute http(s) address without credentials')
  return value
}

function image(v: unknown, path: string): ImageView {
  const o = obj(v, path)
  const blurDataURL = str(o.blurDataURL, `${path}.blurDataURL`)
  const tone = str(o.tone, `${path}.tone`)
  if (!BLUR_PLACEHOLDER.test(blurDataURL)) fail(`${path}.blurDataURL`, 'a base64 image data URL')
  if (!TONE.test(tone)) fail(`${path}.tone`, 'a #rrggbb colour')
  return {
    src: imageUrl(o.src, `${path}.src`),
    width: num(o.width, `${path}.width`),
    height: num(o.height, `${path}.height`),
    blurDataURL,
    tone,
    alt: str(o.alt, `${path}.alt`),
  }
}

function fact(v: unknown, path: string): FactView {
  const o = obj(v, path)
  return { label: str(o.label, `${path}.label`), value: str(o.value, `${path}.value`) }
}

/** `null` for a panel type this version of the UI does not know: it is left out rather than breaking the project. */
function panel(v: unknown, path: string): Exclude<PanelView, { type: 'summary' }> | null {
  const o = obj(v, path)
  const type = str(o.type, `${path}.type`)
  if (!PANEL_TYPES.includes(type)) {
    console.warn(`[content] ${path}: unknown panel type "${type}" left out`)
    return null
  }
  switch (type) {
    case 'intro':
      return { type, ...(o.heading === undefined ? {} : { heading: str(o.heading, `${path}.heading`) }), body: strs(o.body, `${path}.body`) }
    case 'image': {
      const shape = str(o.shape, `${path}.shape`)
      if (!SHAPES.includes(shape)) fail(`${path}.shape`, 'one of ' + SHAPES.join(', '))
      return { type, shape: shape as 'portrait', image: image(o.image, `${path}.image`), ...(o.caption === undefined ? {} : { caption: str(o.caption, `${path}.caption`) }) }
    }
    case 'imagePair': {
      const images = arr(o.images, `${path}.images`)
      if (images.length !== 2) fail(`${path}.images`, 'two images')
      const captions = o.captions === undefined ? undefined : strs(o.captions, `${path}.captions`)
      if (captions && captions.length !== 2) fail(`${path}.captions`, 'two captions')
      return {
        type,
        images: [image(images[0], `${path}.images[0]`), image(images[1], `${path}.images[1]`)],
        ...(captions ? { captions: [captions[0], captions[1]] as [string, string] } : {}),
      }
    }
    case 'quote':
      return { type, text: str(o.text, `${path}.text`), attribution: str(o.attribution, `${path}.attribution`) }
    case 'diagram':
      return { type, image: image(o.image, `${path}.image`), caption: str(o.caption, `${path}.caption`) }
    case 'facts':
      return { type, heading: str(o.heading, `${path}.heading`), items: arr(o.items, `${path}.items`).map((f, i) => fact(f, `${path}.items[${i}]`)) }
    case 'context':
      return { type, heading: str(o.heading, `${path}.heading`), body: str(o.body, `${path}.body`), coordinates: str(o.coordinates, `${path}.coordinates`) }
    case 'credits':
      return {
        type,
        groups: arr(o.groups, `${path}.groups`).map((g, i) => {
          const group = obj(g, `${path}.groups[${i}]`)
          return { role: str(group.role, `${path}.groups[${i}].role`), names: strs(group.names, `${path}.groups[${i}].names`) }
        }),
      }
    default:
      return { type: 'related', slugs: strs(o.slugs, `${path}.slugs`) }
  }
}

function term<K extends string>(v: unknown, path: string, known: readonly string[], what: string): K {
  const key = str(obj(v, path).key, `${path}.key`)
  if (!known.includes(key)) console.warn(`[content] ${path}: ${what} "${key}" has no label in the UI dictionary`)
  return key as K
}

export function mapProject(v: unknown, path = 'project'): ProjectView {
  const o = obj(v, path)
  const status = str(o.status, `${path}.status`)
  if (!STATUSES.includes(status)) fail(`${path}.status`, 'one of ' + STATUSES.join(', '))

  const shortDescription = str(o.shortDescription, `${path}.shortDescription`)
  const description = strs(o.description, `${path}.description`)
  const facts = arr(o.facts, `${path}.facts`).map((f, i) => fact(f, `${path}.facts[${i}]`))
  const panels = arr(o.panels, `${path}.panels`)
    .map((p, i) => panel(p, `${path}.panels[${i}]`))
    .filter((p): p is Exclude<PanelView, { type: 'summary' }> => p !== null)

  return {
    id: str(o.id, `${path}.id`),
    index: num(o.index, `${path}.index`),
    slug: str(o.slug, `${path}.slug`),
    category: term<CategoryKey>(o.category, `${path}.category`, KNOWN_CATEGORIES, 'category'),
    typology: term<TypologyKey>(o.typology, `${path}.typology`, KNOWN_TYPOLOGIES, 'typology'),
    status: status as StatusKey,
    year: num(o.year, `${path}.year`),
    area: num(o.area, `${path}.area`),
    title: str(o.title, `${path}.title`),
    location: str(o.location, `${path}.location`),
    client: o.client === null || o.client === undefined ? '' : str(o.client, `${path}.client`),
    shortDescription,
    description,
    hero: image(o.hero, `${path}.hero`),
    facts,
    panels: [{ type: 'summary', lead: shortDescription, body: description, facts }, ...panels],
    related: strs(o.related, `${path}.related`),
  }
}

/** The body of `GET /api/v1/{locale}/projects?include=story`. */
export function mapProjects(json: unknown, locale: Locale): ProjectView[] {
  const root = obj(json, 'response')
  const meta = obj(root.meta, 'response.meta')
  if (meta.locale !== locale) fail('response.meta.locale', `"${locale}"`)
  return arr(root.data, 'response.data').map((p, i) => mapProject(p, `data[${i}]`))
}
