import type { Locale } from '@/i18n/config'

/** A value available in every supported locale. */
export type Localized<T> = Record<Locale, T>

export type CategoryKey = 'architecture' | 'interiors' | 'landscape' | 'planning'
export type TypologyKey = 'culture' | 'residential' | 'hospitality' | 'public-space' | 'urban' | 'science'
export type StatusKey = 'concept' | 'design' | 'construction' | 'completed'

export interface ImageAsset {
  /** Manifest key, e.g. "meridian-pavilion/hero". */
  key: string
  src: string
  width: number
  height: number
  /** 10px inline JPEG used as blur placeholder. */
  blurDataURL: string
  /** Average colour, painted behind the image while it decodes. */
  tone: string
  alt: Localized<string>
}

export interface Fact {
  label: Localized<string>
  value: Localized<string>
}

export interface CreditGroup {
  role: Localized<string>
  names: Localized<string[]>
}

/** Panels are the units of the horizontal narrative, in reading order. */
export type Panel =
  | { type: 'intro'; heading?: Localized<string>; body: Localized<string[]> }
  | { type: 'image'; image: ImageAsset; shape: 'portrait' | 'landscape' | 'wide' | 'square'; caption?: Localized<string> }
  | { type: 'imagePair'; images: [ImageAsset, ImageAsset]; captions?: [Localized<string>, Localized<string>] }
  | { type: 'quote'; text: Localized<string>; attribution: Localized<string> }
  | { type: 'diagram'; image: ImageAsset; caption: Localized<string> }
  | { type: 'facts'; heading: Localized<string>; items: Fact[] }
  | { type: 'context'; heading: Localized<string>; body: Localized<string>; coordinates: string }
  | { type: 'credits'; groups: CreditGroup[] }
  | { type: 'related'; slugs: string[] }

export type PanelType = Panel['type']

export interface Project {
  id: string
  slug: string
  category: CategoryKey
  typology: TypologyKey
  status: StatusKey
  year: number
  /** Gross floor / site area in square metres. */
  area: number
  title: Localized<string>
  location: Localized<string>
  client: Localized<string>
  /** Used by the overview and for meta descriptions. */
  shortDescription: Localized<string>
  description: Localized<string[]>
  /** The overview thumbnail intentionally IS the hero asset: the zoom grows the same pixels. */
  thumbnail: ImageAsset
  hero: ImageAsset
  /** Extra facts shown in the meta column / facts panel. */
  facts: Fact[]
  panels: Panel[]
  related: string[]
}
