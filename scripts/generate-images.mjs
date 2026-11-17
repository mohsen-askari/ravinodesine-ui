// Procedural architectural imagery for the Ravino portfolio.
//
// There is no licensed photography in this repository, and the reference site's
// assets must not be copied. Every image here is an original illustration
// generated from code (SVG -> JPEG via sharp), deterministic per seed.
// Replace the files in public/media/** (and keep the manifest keys) with real,
// authorised photography when it is available.
//
// Usage: npm run images            (all)   |   npm run images -- meridian-pavilion
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public/media')
const manifestPath = path.join(root, 'src/content/image-manifest.json')

// ---------------------------------------------------------------- utilities
function rngFor(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const f = (n) => Math.round(n * 10) / 10
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
const toHex = (a) => '#' + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
const mix = (a, b, t) => {
  const x = hex(a)
  const y = hex(b)
  return toHex(x.map((v, i) => v + (y[i] - v) * t))
}
const shade = (c, k) => (k < 0 ? mix(c, '#000000', -k) : mix(c, '#ffffff', k))
const poly = (pts, fill, extra = '') => `<polygon points="${pts.map((p) => `${f(p[0])},${f(p[1])}`).join(' ')}" fill="${fill}" ${extra}/>`
const rect = (x, y, w, h, fill, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}" ${extra}/>`
const line = (x1, y1, x2, y2, stroke, sw = 1, extra = '') =>
  `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`
const lin = (id, stops, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops
    .map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`)
    .join('')}</linearGradient>`
const rad = (id, stops) =>
  `<radialGradient id="${id}">${stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</radialGradient>`
const blur = (id, s) => `<filter id="${id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${s}"/></filter>`

const PAL = {
  dawn: { skyTop: '#7fa6cf', skyLow: '#f3d6c4', ground: '#b9a899', water: '#7f97ae', wall: '#ece6dc', dark: '#3a3a40', accent: '#c9794f', green: '#6b7f5a', glow: '#ffd9b0' },
  overcast: { skyTop: '#aeb9c4', skyLow: '#e5e8e7', ground: '#9aa092', water: '#8c9ba6', wall: '#dcdad4', dark: '#33373b', accent: '#7c8a78', green: '#5d7459', glow: '#ffffff' },
  dusk: { skyTop: '#1f2b45', skyLow: '#e8a47c', ground: '#2f2f3a', water: '#2d3a55', wall: '#cfc3b6', dark: '#16181f', accent: '#ffcf8a', green: '#2f4a3d', glow: '#ffbf80' },
  desert: { skyTop: '#8fbbdc', skyLow: '#f1e0c3', ground: '#d3a971', water: '#b9a283', wall: '#e9d8bd', dark: '#4a3b2c', accent: '#b5562f', green: '#7b7a45', glow: '#fff1d0' },
  forest: { skyTop: '#a3c6df', skyLow: '#e1ebdf', ground: '#5d7a52', water: '#6f8f91', wall: '#e8e4da', dark: '#27332a', accent: '#b98550', green: '#4d6b45', glow: '#f7f3d8' },
  blue: { skyTop: '#5f8fc3', skyLow: '#cfe0ee', ground: '#8fa0aa', water: '#4f7aa0', wall: '#f1f2f0', dark: '#2a3342', accent: '#e2a64b', green: '#58765f', glow: '#ffffff' },
  clay: { skyTop: '#c9b7a6', skyLow: '#f2e4d3', ground: '#a98a6d', water: '#9c8b7f', wall: '#e2c7a9', dark: '#40332a', accent: '#a5432c', green: '#80804f', glow: '#fff0da' },
}

function skyDefs(p, id = 'sky') {
  return lin(id, [
    [0, p.skyTop],
    [1, p.skyLow],
  ])
}

function hills(w, y, h, color, rng, steps = 14, opacity = 1) {
  const pts = [[0, y + h]]
  let yy = y + rng() * h * 0.5
  for (let i = 0; i <= steps; i++) {
    yy = y + rng() * h
    pts.push([(w * i) / steps, yy])
  }
  pts.push([w, y + h])
  return poly(pts, color, `opacity="${opacity}"`)
}

function trees(rng, n, x0, x1, y0, y1, color, rmin, rmax) {
  let s = ''
  for (let i = 0; i < n; i++) {
    const x = x0 + rng() * (x1 - x0)
    const y = y0 + rng() * (y1 - y0)
    const r = rmin + rng() * (rmax - rmin)
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${shade(color, (rng() - 0.5) * 0.35)}"/>`
  }
  return s
}

// -------------------------------------------------------------------- scenes
// Every scene returns the inner SVG for a W x H canvas.

function sceneBar(W, H, p, rng, o = {}) {
  const hz = H * (o.horizon ?? 0.6)
  const bx0 = W * 0.06
  const bx1 = W * 0.94
  const by = H * (o.barY ?? 0.3)
  const bh = H * 0.13
  let s = `<defs>${skyDefs(p)}${lin('wat', [[0, mix(p.water, p.skyLow, 0.35)], [1, shade(p.water, -0.35)]])}${rad('sun', [[0, p.glow, 0.9], [1, p.glow, 0]])}${blur('b6', 6)}${blur('b14', 14)}${lin('slab', [[0, shade(p.wall, 0.08)], [1, shade(p.wall, -0.18)]])}</defs>`
  s += rect(0, 0, W, hz, 'url(#sky)')
  s += `<circle cx="${W * 0.78}" cy="${hz}" r="${W * 0.35}" fill="url(#sun)"/>`
  s += hills(W, hz - H * 0.07, H * 0.07, mix(p.skyLow, p.dark, 0.35), rng, 18, 0.55)
  s += hills(W, hz - H * 0.035, H * 0.04, mix(p.skyLow, p.dark, 0.55), rng, 22, 0.7)
  s += rect(0, hz, W, H - hz, 'url(#wat)')
  // pilotis + reflection
  const n = o.piers ?? 7
  let piers = ''
  for (let i = 0; i < n; i++) {
    const x = bx0 + ((bx1 - bx0) * (i + 0.5)) / n
    piers += rect(x - 5, by + bh, 10, hz - by - bh + H * 0.03, shade(p.dark, 0.15))
  }
  s += piers
  // slab bar
  s += rect(bx0, by, bx1 - bx0, bh, 'url(#slab)')
  s += rect(bx0 - 14, by - 10, bx1 - bx0 + 28, 12, shade(p.dark, 0.1))
  // vertical fins
  const fins = Math.floor((bx1 - bx0) / 14)
  for (let i = 0; i < fins; i++) {
    const x = bx0 + 6 + i * ((bx1 - bx0 - 12) / fins)
    s += rect(x, by + 6, 3, bh - 12, p.dark, `opacity="${0.22 + rng() * 0.25}"`)
  }
  // glass band glow
  s += rect(bx0 + 20, by + bh * 0.62, bx1 - bx0 - 40, bh * 0.22, p.accent, 'opacity="0.55"')
  // roof garden
  s += trees(rng, 60, bx0 + 10, bx1 - 10, by - 22, by - 6, p.green, 4, 11)
  // reflection
  s += `<g transform="translate(0 ${hz * 2 + H * 0.03}) scale(1 -1)" opacity="0.28" filter="url(#b6)">${piers}${rect(bx0, by, bx1 - bx0, bh, p.wall)}${rect(bx0 + 20, by + bh * 0.62, bx1 - bx0 - 40, bh * 0.22, p.accent)}</g>`
  s += rect(0, hz, W, H - hz, 'url(#wat)', 'opacity="0.25"')
  for (let i = 0; i < 90; i++) s += rect(rng() * W, hz + rng() * (H - hz), 30 + rng() * 160, 1.4, '#ffffff', `opacity="${0.05 + rng() * 0.14}"`)
  return s
}

function sceneTerraces(W, H, p, rng, o = {}) {
  const base = H * 0.86
  const n = o.levels ?? 6
  let s = `<defs>${skyDefs(p)}${blur('b8', 8)}${lin('gr', [[0, p.ground], [1, shade(p.ground, -0.3)]])}</defs>`
  s += rect(0, 0, W, H, 'url(#sky)')
  s += hills(W, H * 0.34, H * 0.24, mix(p.skyLow, p.dark, 0.3), rng, 12, 0.55)
  s += hills(W, H * 0.46, H * 0.2, mix(p.skyLow, p.dark, 0.5), rng, 16, 0.7)
  s += hills(W, H * 0.58, H * 0.16, mix(p.green, p.dark, 0.35), rng, 20, 0.9)
  s += rect(0, base - 2, W, H - base + 2, 'url(#gr)')
  const sh = H * 0.082
  for (let i = 0; i < n; i++) {
    const w = W * (0.84 - i * 0.092)
    const x = W * 0.07 + i * W * 0.052 + (o.shift ?? 0)
    const y = base - (i + 1) * sh
    s += `<g>${rect(x + 14, y + sh, w, 14, '#000000', 'opacity="0.18" filter="url(#b8)"')}`
    s += rect(x, y, w, sh, shade(p.wall, (i % 2 ? -0.05 : 0.03)))
    // mullions
    const m = Math.floor(w / 26)
    for (let k = 1; k < m; k++) s += rect(x + (k * w) / m, y + sh * 0.3, 2, sh * 0.62, p.dark, 'opacity="0.3"')
    s += rect(x, y + sh * 0.3, w, sh * 0.62, p.dark, 'opacity="0.2"')
    // soffit & planter
    s += rect(x - 10, y - 6, w + 20, 9, shade(p.wall, -0.28))
    s += rect(x - 6, y - 20, w + 12, 14, p.green)
    s += trees(rng, Math.floor(w / 18), x, x + w, y - 26, y - 10, p.green, 5, 12)
    s += '</g>'
  }
  s += trees(rng, 70, 0, W, base - 4, base + (H - base) * 0.6, p.green, 6, 16)
  return s
}

function sceneVaults(W, H, p, rng, o = {}) {
  const hz = H * 0.8
  const n = o.count ?? 6
  const gap = W * 0.012
  const aw = (W * 0.88 - gap * (n - 1)) / n
  const ah = H * (o.height ?? 0.55)
  let s = `<defs>${skyDefs(p)}${blur('b6', 6)}${lin('glow', [[0, p.accent], [1, p.glow]])}${lin('vaultshade', [[0, shade(p.wall, 0.06)], [1, shade(p.wall, -0.22)]], 1, 0)}${lin('pool', [[0, mix(p.water, p.skyLow, 0.4)], [1, shade(p.water, -0.2)]])}</defs>`
  s += rect(0, 0, W, hz, 'url(#sky)')
  s += hills(W, hz - H * 0.1, H * 0.1, mix(p.skyLow, p.dark, 0.3), rng, 12, 0.5)
  s += rect(0, hz, W, H - hz, 'url(#pool)')
  const x0 = W * 0.06
  const vault = (x, y, w, h, fill, extra = '') => {
    const r = w / 2
    return `<path d="M${f(x)},${f(y)} L${f(x)},${f(y - h + r)} A${f(r)},${f(r)} 0 0 1 ${f(x + w)},${f(y - h + r)} L${f(x + w)},${f(y)} Z" fill="${fill}" ${extra}/>`
  }
  let arches = ''
  for (let i = 0; i < n; i++) {
    const x = x0 + i * (aw + gap)
    const hh = ah * (1 - (o.stagger ?? 0.06) * Math.abs(i - (n - 1) / 2))
    arches += vault(x, hz, aw, hh, 'url(#vaultshade)')
    arches += vault(x + aw * 0.14, hz, aw * 0.72, hh * 0.78, 'url(#glow)', `opacity="${0.75 + rng() * 0.2}"`)
    arches += rect(x + aw * 0.14, hz - hh * 0.22, aw * 0.72, hh * 0.22, p.dark, 'opacity="0.28"')
    // bench / figure
    arches += rect(x + aw * 0.4, hz - hh * 0.12, aw * 0.2, hh * 0.12, p.dark, 'opacity="0.55"')
  }
  s += arches
  s += `<g transform="translate(0 ${hz * 2}) scale(1 -1)" opacity="0.25" filter="url(#b6)">${arches}</g>`
  s += rect(0, hz, W, H - hz, 'url(#pool)', 'opacity="0.3"')
  s += trees(rng, 40, 0, W, hz - 14, hz + 4, p.green, 6, 14)
  return s
}

function sceneAerial(W, H, p, rng, o = {}) {
  const cx = W / 2
  const cy = H / 2
  let s = `<defs>${blur('b5', 5)}${lin('gr', [[0, mix(p.ground, p.green, 0.35)], [1, mix(p.ground, p.green, 0.65)]], 1, 1)}</defs>`
  s += rect(0, 0, W, H, 'url(#gr)')
  // paths
  s += rect(0, cy - 14, W, 28, shade(p.ground, 0.25), 'opacity="0.8"')
  s += rect(cx - 14, 0, 28, H, shade(p.ground, 0.25), 'opacity="0.8"')
  // grass patches / trees
  s += trees(rng, 160, 0, W, 0, H, p.green, 8, 26)
  // courtyard (void) and blocks around
  const cw = W * 0.34
  const ch = H * 0.42
  const blocks = []
  const ring = o.ring ?? 14
  for (let i = 0; i < ring; i++) {
    const t = (i / ring) * Math.PI * 2
    const bw = W * (0.1 + rng() * 0.08)
    const bh = H * (0.1 + rng() * 0.1)
    const bx = cx + Math.cos(t) * (cw * 0.95) - bw / 2
    const by = cy + Math.sin(t) * (ch * 0.95) - bh / 2
    blocks.push([bx, by, bw, bh])
  }
  for (const [bx, by, bw, bh] of blocks) {
    s += rect(bx + 14, by + 16, bw, bh, '#000000', 'opacity="0.28" filter="url(#b5)"')
    s += rect(bx, by, bw, bh, shade(p.wall, (rng() - 0.5) * 0.12))
    s += rect(bx + bw * 0.1, by + bh * 0.1, bw * 0.8, bh * 0.8, shade(p.wall, -0.08))
    s += rect(bx + bw * 0.3, by + bh * 0.3, bw * 0.4, bh * 0.4, p.accent, 'opacity="0.45"')
  }
  // central court
  s += rect(cx - cw * 0.5, cy - ch * 0.5, cw, ch, shade(p.water, 0.15), 'opacity="0.9"')
  s += rect(cx - cw * 0.5, cy - ch * 0.5, cw, ch, 'none', `stroke="${p.wall}" stroke-width="10"`)
  for (let i = 0; i < 6; i++) s += line(cx - cw * 0.5, cy - ch * 0.5 + (ch * i) / 5, cx + cw * 0.5, cy - ch * 0.5 + (ch * i) / 5, '#fff', 1.5, 'opacity="0.25"')
  return s
}

function cuboid(x, y, w, d, h, p, light = 0) {
  // isometric cuboid; (x,y) = bottom front corner
  const dx = d * 0.866
  const dy = d * 0.5
  const wx = w * 0.866
  const wy = w * 0.5
  const top = [
    [x, y - h],
    [x + wx, y - h - wy],
    [x + wx + dx, y - h - wy + dy * -0 - dy + dy * 0],
    [x + dx, y - h - dy],
  ]
  // proper iso: left face (width axis to up-right), right face (depth axis to up-left)
  const A = [x, y]
  const B = [x + wx, y - wy]
  const C = [x - dx, y - dy]
  const D = [x + wx - dx, y - wy - dy]
  void top
  const up = (pt) => [pt[0], pt[1] - h]
  return [
    poly([A, B, up(B), up(A)], shade(p.wall, -0.1 + light)),
    poly([A, C, up(C), up(A)], shade(p.wall, -0.32 + light)),
    poly([up(A), up(B), up(D), up(C)], shade(p.wall, 0.12 + light)),
  ].join('')
}

function sceneMonoliths(W, H, p, rng, o = {}) {
  const hz = H * 0.52
  let s = `<defs>${skyDefs(p)}${lin('gr', [[0, mix(p.ground, p.skyLow, 0.35)], [1, shade(p.ground, -0.25)]])}${blur('b4', 4)}</defs>`
  s += rect(0, 0, W, hz, 'url(#sky)')
  s += hills(W, hz - H * 0.12, H * 0.12, mix(p.skyLow, p.dark, 0.4), rng, 10, 0.7)
  s += rect(0, hz, W, H - hz, 'url(#gr)')
  const items = []
  const n = o.count ?? 7
  for (let i = 0; i < n; i++) {
    items.push({ x: W * (0.15 + rng() * 0.7), y: hz + H * (0.12 + rng() * 0.32), w: W * (0.05 + rng() * 0.07), d: W * (0.05 + rng() * 0.08), h: H * (0.12 + rng() * 0.3) })
  }
  items.sort((a, b) => a.y - b.y)
  for (const c of items) {
    const dx = c.d * 0.866
    // long shadow to the right
    s += poly(
      [
        [c.x - dx, c.y - c.d * 0.5],
        [c.x + c.w * 0.866, c.y - c.w * 0.5],
        [c.x + c.w * 0.866 + c.h * 1.6, c.y - c.w * 0.5 + c.h * 0.25],
        [c.x - dx + c.h * 1.6, c.y - c.d * 0.5 + c.h * 0.25],
      ],
      '#000',
      'opacity="0.22" filter="url(#b4)"',
    )
    s += cuboid(c.x, c.y, c.w, c.d, c.h, p)
    // window slits
    const slits = Math.floor(c.h / 26)
    for (let k = 1; k < slits; k++) s += poly([[c.x + 6, c.y - k * 26], [c.x + c.w * 0.866 - 6, c.y - c.w * 0.5 - k * 26 + 6], [c.x + c.w * 0.866 - 6, c.y - c.w * 0.5 - k * 26 + 12], [c.x + 6, c.y - k * 26 + 6]], p.dark, 'opacity="0.35"')
  }
  s += trees(rng, 50, 0, W, hz + 4, H, p.green, 5, 14)
  return s
}

function sceneObservatory(W, H, p, rng) {
  const hz = H * 0.66
  let s = `<defs>${skyDefs(p)}${rad('moon', [[0, '#fff6e0', 1], [0.3, '#fff6e0', 0.35], [1, '#fff6e0', 0]])}${lin('tw', [[0, shade(p.wall, 0.1)], [1, shade(p.wall, -0.25)]], 1, 0)}${lin('dn', [[0, shade(p.ground, 0.1)], [1, shade(p.ground, -0.35)]])}${blur('b10', 10)}</defs>`
  s += rect(0, 0, W, H, 'url(#sky)')
  for (let i = 0; i < 120; i++) s += `<circle cx="${f(rng() * W)}" cy="${f(rng() * hz * 0.7)}" r="${f(0.5 + rng() * 1.4)}" fill="#fff" opacity="${(0.2 + rng() * 0.6).toFixed(2)}"/>`
  s += `<circle cx="${W * 0.2}" cy="${H * 0.2}" r="${W * 0.16}" fill="url(#moon)"/><circle cx="${W * 0.2}" cy="${H * 0.2}" r="${W * 0.018}" fill="#fff6e0"/>`
  // distant dunes
  const dune = (y, amp, color, op) => {
    let d = `M0,${H} L0,${y}`
    for (let i = 0; i <= 8; i++) d += ` Q${(W * (i + 0.5)) / 8},${y - amp * (0.5 + rng())} ${(W * (i + 1)) / 8},${y + rng() * amp * 0.4}`
    return `<path d="${d} L${W},${H} Z" fill="${color}" opacity="${op}"/>`
  }
  s += dune(hz - H * 0.05, H * 0.07, mix(p.ground, p.skyLow, 0.5), 0.85)
  s += dune(hz, H * 0.07, mix(p.ground, p.dark, 0.2), 1)
  // tower + dome
  const tx = W * 0.58
  const tw = W * 0.15
  const th = H * 0.2
  s += rect(tx + 14, hz - 6, th * 0.9, 14, '#000', 'opacity="0.28" filter="url(#b10)"')
  s += rect(tx - tw / 2 - 20, hz - H * 0.025, tw + 40, H * 0.03, shade(p.wall, -0.2))
  s += rect(tx - tw / 2, hz - th, tw, th, 'url(#tw)')
  s += rect(tx - tw * 0.32, hz - th * 0.62, tw * 0.64, 6, p.accent, 'opacity="0.75"')
  s += `<path d="M${tx - tw * 0.8},${hz - th} A${tw * 0.8},${tw * 0.9} 0 0 1 ${tx + tw * 0.8},${hz - th} Z" fill="${shade(p.wall, 0.1)}"/>`
  s += `<path d="M${tx - 5},${hz - th} L${tx - 5},${hz - th - tw * 0.88} L${tx + 5},${hz - th - tw * 0.86} L${tx + 5},${hz - th} Z" fill="${p.dark}" opacity="0.55"/>`
  // low wing
  s += rect(tx - tw * 2.4, hz - H * 0.07, tw * 1.6, H * 0.07, 'url(#tw)')
  s += rect(tx - tw * 2.4, hz - H * 0.045, tw * 1.6, 6, p.accent, 'opacity="0.8"')
  s += dune(hz + H * 0.1, H * 0.09, shade(p.ground, -0.1), 1)
  s += dune(hz + H * 0.2, H * 0.08, shade(p.ground, -0.3), 1)
  return s
}

function sceneInterior(W, H, p, rng, o = {}) {
  const vx = W * 0.5
  const vy = H * 0.46
  const iw = W * 0.34
  const ih = H * 0.34
  const L = vx - iw
  const R = vx + iw
  const T = vy - ih
  const B = vy + ih * 0.8
  let s = `<defs>${lin('floor', [[0, shade(p.ground, 0.1)], [1, shade(p.ground, -0.25)]])}${lin('ceil', [[0, shade(p.wall, -0.15)], [1, shade(p.wall, 0.05)]])}${lin('lw', [[0, shade(p.wall, -0.32)], [1, shade(p.wall, -0.08)]], 1, 0)}${lin('rw', [[0, shade(p.wall, -0.08)], [1, shade(p.wall, -0.36)]], 1, 0)}${lin('ln', [[0, p.glow], [1, p.accent]])}${blur('b20', 20)}${blur('b3', 3)}</defs>`
  s += rect(0, 0, W, H, shade(p.wall, -0.1))
  s += poly([[0, 0], [W, 0], [R, T], [L, T]], 'url(#ceil)')
  s += poly([[0, H], [W, H], [R, B], [L, B]], 'url(#floor)')
  s += poly([[0, 0], [L, T], [L, B], [0, H]], 'url(#lw)')
  s += poly([[W, 0], [R, T], [R, B], [W, H]], 'url(#rw)')
  s += rect(L, T, R - L, B - T, shade(p.wall, 0.02))
  // arched openings on back wall
  const n = o.arches ?? 3
  const aw = (R - L) / (n * 1.5)
  for (let i = 0; i < n; i++) {
    const x = L + (R - L) * ((i + 0.5) / n) - aw / 2
    s += `<path d="M${f(x)},${f(B)} L${f(x)},${f(T + ih * 0.5)} A${f(aw / 2)},${f(aw / 2)} 0 0 1 ${f(x + aw)},${f(T + ih * 0.5)} L${f(x + aw)},${f(B)} Z" fill="url(#ln)"/>`
    s += `<path d="M${f(x)},${f(B)} L${f(x)},${f(T + ih * 0.5)} A${f(aw / 2)},${f(aw / 2)} 0 0 1 ${f(x + aw)},${f(T + ih * 0.5)} L${f(x + aw)},${f(B)} Z" fill="none" stroke="${shade(p.wall, -0.3)}" stroke-width="5"/>`
  }
  // light shafts through the left wall
  for (let i = 0; i < 3; i++) {
    const y = H * (0.2 + i * 0.16)
    s += poly([[0, y], [L * 0.9, y + 18], [L * 0.9, y + 80], [0, y + 120]], p.glow, 'opacity="0.35"')
  }
  s += poly([[W * 0.62, H], [W * 0.9, H], [W * 0.78, B + 10], [W * 0.66, B + 10]], p.glow, 'opacity="0.2" filter="url(#b20)"')
  // bench + table
  s += rect(vx - iw * 0.55, B - ih * 0.12, iw * 1.1, ih * 0.1, shade(p.wall, -0.4))
  s += rect(vx - iw * 0.5, B - ih * 0.02, iw, ih * 0.05, '#000', 'opacity="0.22" filter="url(#b3)"')
  s += rect(vx - iw * 0.12, B - ih * 0.2, iw * 0.24, ih * 0.08, shade(p.accent, -0.1))
  // pendant
  s += line(vx, 0, vx, T + ih * 0.2, p.dark, 2) + `<circle cx="${vx}" cy="${T + ih * 0.24}" r="${iw * 0.06}" fill="${p.glow}"/>`
  return s
}

function sceneTower(W, H, p, rng, o = {}) {
  const hz = H * 0.84
  let s = `<defs>${skyDefs(p)}${lin('gr', [[0, shade(p.ground, 0.1)], [1, shade(p.ground, -0.35)]])}${lin('face', [[0, shade(p.wall, -0.1)], [1, shade(p.wall, -0.4)]], 1, 0)}${blur('b12', 12)}</defs>`
  s += rect(0, 0, W, hz, 'url(#sky)')
  for (let i = 0; i < 16; i++) {
    const x = rng() * W
    const h = H * (0.1 + rng() * 0.3)
    const w = W * (0.025 + rng() * 0.04)
    s += rect(x, hz - h, w, h, mix(p.skyLow, p.dark, 0.35 + rng() * 0.2), 'opacity="0.85"')
  }
  s += rect(0, hz, W, H - hz, 'url(#gr)')
  const tx = W * 0.5
  const volumes = o.volumes ?? 7
  let y = hz
  let lit = ''
  for (let i = 0; i < volumes; i++) {
    const vh = H * (0.075 + rng() * 0.045)
    const vw = W * (0.14 + rng() * 0.09) * (1 - i * 0.02)
    const vx = tx - vw / 2 + (rng() - 0.5) * W * 0.07
    s += rect(vx, y - vh, vw, vh, 'url(#face)')
    s += rect(vx - 6, y - vh - 4, vw + 12, 6, shade(p.wall, -0.45))
    const cols = Math.floor(vw / 16)
    const rows = Math.floor(vh / 14)
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const on = rng() > 0.55
      lit += rect(vx + 6 + c * ((vw - 12) / cols), y - vh + 5 + r * (vh / rows), (vw - 12) / cols - 3, vh / rows - 4, on ? p.accent : p.dark, `opacity="${on ? 0.9 : 0.35}"`)
    }
    y -= vh
  }
  s += lit
  s += `<g opacity="0.4" filter="url(#b12)">${lit}</g>`
  s += trees(rng, 40, 0, W, hz, hz + 20, p.green, 6, 16)
  return s
}

function sceneFacade(W, H, p, rng, o = {}) {
  let s = `<defs>${lin('bg', [[0, shade(p.wall, 0.15)], [1, shade(p.wall, -0.25)]], 1, 0.3)}${lin('fin', [[0, shade(p.accent, 0.1)], [1, shade(p.accent, -0.4)]], 1, 0)}${lin('shad', [[0, '#000', 0.5], [1, '#000', 0]], 1, 0)}</defs>`
  s += rect(0, 0, W, H, 'url(#bg)')
  const n = o.fins ?? 22
  const fw = W / n
  for (let i = 0; i < n; i++) {
    s += rect(i * fw + fw * 0.18, 0, fw * 0.64, H, 'url(#fin)', `opacity="${0.85 + rng() * 0.15}"`)
    s += rect(i * fw + fw * 0.82, 0, fw * 0.5, H, 'url(#shad)', 'opacity="0.55"')
  }
  s += rect(0, H * 0.58, W, 14, p.dark, 'opacity="0.55"')
  s += rect(0, H * 0.58 + 14, W, H, p.dark, 'opacity="0.18"')
  s += rect(0, 0, W, H, shade(p.glow, 0), 'opacity="0.06"')
  return s
}

const INK = '#23262c'
function diagramFrame(W, H, title, code) {
  return (
    rect(0, 0, W, H, '#f1eee7') +
    rect(W * 0.04, H * 0.05, W * 0.92, H * 0.9, 'none', `stroke="${INK}" stroke-width="1.5"`) +
    `<text x="${W * 0.055}" y="${H * 0.925}" font-family="Helvetica, Arial, sans-serif" font-size="${Math.max(11, W * 0.011)}" letter-spacing="2" fill="${INK}">${title}</text>` +
    `<text x="${W * 0.945}" y="${H * 0.925}" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="${Math.max(11, W * 0.011)}" letter-spacing="2" fill="${INK}" opacity="0.6">${code}</text>`
  )
}

function scenePlan(W, H, p, rng, o = {}) {
  let s = diagramFrame(W, H, o.title ?? 'SITE PLAN', o.code ?? 'A-101  1:500')
  const cx = W / 2
  const cy = H * 0.48
  const ring = o.ring ?? 10
  for (let i = 0; i < 4; i++) s += `<circle cx="${cx}" cy="${cy}" r="${Math.min(W, H) * (0.12 + i * 0.07)}" fill="none" stroke="${INK}" stroke-width="${i === 3 ? 1.8 : 0.8}" ${i % 2 ? 'stroke-dasharray="6 6"' : ''} opacity="${0.35 + i * 0.15}"/>`
  s += line(W * 0.08, cy, W * 0.92, cy, INK, 0.8, 'stroke-dasharray="14 6 2 6" opacity="0.5"')
  s += line(cx, H * 0.08, cx, H * 0.86, INK, 0.8, 'stroke-dasharray="14 6 2 6" opacity="0.5"')
  for (let i = 0; i < ring; i++) {
    const t = (i / ring) * Math.PI * 2 + 0.3
    const r = Math.min(W, H) * (0.19 + (i % 3) * 0.07)
    const bw = W * (0.05 + rng() * 0.05)
    const bh = H * (0.05 + rng() * 0.06)
    const x = cx + Math.cos(t) * r - bw / 2
    const y = cy + Math.sin(t) * r - bh / 2
    s += rect(x, y, bw, bh, '#f1eee7', `stroke="${INK}" stroke-width="1.6"`)
    for (let k = 1; k < 5; k++) s += line(x, y + (bh * k) / 5, x + bw, y + (bh * k) / 5, INK, 0.5, 'opacity="0.4"')
  }
  // dimension ticks
  for (let i = 0; i <= 10; i++) s += line(W * 0.08 + (W * 0.84 * i) / 10, H * 0.88, W * 0.08 + (W * 0.84 * i) / 10, H * 0.9, INK, 1)
  s += line(W * 0.08, H * 0.89, W * 0.92, H * 0.89, INK, 1)
  s += `<g transform="translate(${W * 0.88} ${H * 0.12})"><circle r="${H * 0.035}" fill="none" stroke="${INK}" stroke-width="1.2"/><path d="M0,${-H * 0.03} L${H * 0.012},${H * 0.012} L0,0 L${-H * 0.012},${H * 0.012} Z" fill="${INK}"/></g>`
  return s
}

function sceneSection(W, H, p, rng, o = {}) {
  let s = diagramFrame(W, H, o.title ?? 'SECTION B-B', o.code ?? 'A-301  1:200')
  const gy = H * 0.7
  s += line(W * 0.04, gy, W * 0.96, gy, INK, 2)
  for (let i = 0; i < 90; i++) s += line(W * 0.045 + i * (W * 0.91 / 90), gy, W * 0.045 + i * (W * 0.91 / 90) - 14, gy + 14, INK, 0.7, 'opacity="0.45"')
  const n = o.levels ?? 5
  for (let i = 0; i < n; i++) {
    const w = W * (0.7 - i * 0.1)
    const x = W * 0.15 + i * W * 0.04
    const y = gy - (i + 1) * H * 0.095
    s += rect(x, y, w, H * 0.095, '#f1eee7', `stroke="${INK}" stroke-width="2.2"`)
    s += rect(x - 12, y - 3, w + 24, 6, INK)
    for (let k = 1; k < 8; k++) s += line(x + (w * k) / 8, y, x + (w * k) / 8, y + H * 0.095, INK, 0.6, 'opacity="0.5"')
    s += line(x, y + H * 0.05, x + w, y + H * 0.05, INK, 0.6, 'stroke-dasharray="4 4" opacity="0.6"')
    s += `<text x="${x + w + 20}" y="${y + H * 0.06}" font-family="Helvetica, Arial, sans-serif" font-size="${Math.max(10, W * 0.009)}" fill="${INK}">+${((i + 1) * 3.6).toFixed(1)}</text>`
  }
  s += line(W * 0.08, H * 0.12, W * 0.08, gy, INK, 1) + line(W * 0.075, H * 0.12, W * 0.085, H * 0.12, INK, 1)
  return s
}

const SCENES = {
  bar: sceneBar,
  terraces: sceneTerraces,
  vaults: sceneVaults,
  aerial: sceneAerial,
  monoliths: sceneMonoliths,
  observatory: sceneObservatory,
  interior: sceneInterior,
  tower: sceneTower,
  facade: sceneFacade,
  plan: scenePlan,
  section: sceneSection,
}

// ----------------------------------------------------------------- the set
// aspect helpers (width x height)
const A = { hero: [2400, 1250], hero11: [2000, 2000], heroTall: [1800, 2200], land: [1800, 1200], wide: [2400, 1000], port: [1200, 1600], sq: [1400, 1400] }

const SET = {
  'meridian-pavilion': {
    pal: 'dawn',
    images: [
      ['hero', 'vaults', A.hero, 11, { count: 6 }],
      ['arcade', 'vaults', A.land, 12, { count: 4, height: 0.7 }],
      ['interior', 'interior', A.port, 13, { arches: 3 }],
      ['facade', 'facade', A.sq, 14, { fins: 18 }],
      ['plan', 'plan', A.land, 15, { title: 'GROUND PLAN', code: 'A-101  1:250', ring: 8 }],
      ['section', 'section', A.wide, 16, { title: 'LONGITUDINAL SECTION', code: 'A-301  1:200', levels: 4 }],
    ],
  },
  'tehran-terraces': {
    pal: 'overcast',
    images: [
      ['hero', 'terraces', A.hero11, 21, { levels: 6 }],
      ['garden', 'terraces', A.wide, 22, { levels: 4, shift: 40 }],
      ['interior', 'interior', A.land, 23, { arches: 2 }],
      ['detail', 'facade', A.port, 24, { fins: 12 }],
      ['section', 'section', A.land, 25, { title: 'SECTION A-A', code: 'A-300  1:200', levels: 6 }],
    ],
  },
  'caspian-reading-house': {
    pal: 'forest',
    images: [
      ['hero', 'aerial', A.hero, 31, { ring: 12 }],
      ['court', 'aerial', A.land, 32, { ring: 8 }],
      ['reading', 'interior', A.port, 33, { arches: 4 }],
      ['facade', 'facade', A.land, 34, { fins: 26 }],
      ['plan', 'plan', A.sq, 35, { title: 'FIRST FLOOR PLAN', code: 'A-102  1:200', ring: 12 }],
    ],
  },
  'zagros-lodge': {
    pal: 'clay',
    images: [
      ['hero', 'monoliths', A.heroTall, 41, { count: 8 }],
      ['valley', 'monoliths', A.wide, 42, { count: 5 }],
      ['room', 'interior', A.land, 43, { arches: 3 }],
      ['stone', 'facade', A.port, 44, { fins: 9 }],
      ['plan', 'plan', A.land, 45, { title: 'SITE PLAN', code: 'A-100  1:1000', ring: 7 }],
    ],
  },
  'hormuz-shore-walk': {
    pal: 'blue',
    images: [
      ['hero', 'bar', A.hero, 51, { piers: 8 }],
      ['pier', 'bar', A.wide, 52, { piers: 12, horizon: 0.66, barY: 0.4 }],
      ['dusk', 'bar', A.land, 53, { piers: 6 }],
      ['detail', 'facade', A.port, 54, { fins: 14 }],
      ['plan', 'plan', A.wide, 55, { title: 'PROMENADE PLAN', code: 'L-101  1:1000', ring: 9 }],
    ],
  },
  'green-spine-masterplan': {
    pal: 'forest',
    images: [
      ['hero', 'aerial', A.hero11, 61, { ring: 16 }],
      ['district', 'aerial', A.land, 62, { ring: 10 }],
      ['street', 'monoliths', A.land, 63, { count: 9 }],
      ['plan', 'plan', A.sq, 64, { title: 'MASTERPLAN', code: 'P-001  1:5000', ring: 16 }],
      ['section', 'section', A.wide, 65, { title: 'STREET SECTION', code: 'P-201  1:100', levels: 3 }],
    ],
  },
  'naqsh-atelier-interior': {
    pal: 'clay',
    images: [
      ['hero', 'interior', A.hero, 71, { arches: 3 }],
      ['gallery', 'interior', A.port, 72, { arches: 5 }],
      ['screen', 'facade', A.land, 73, { fins: 30 }],
      ['vaults', 'vaults', A.land, 74, { count: 5, height: 0.6 }],
      ['plan', 'plan', A.land, 75, { title: 'FLOOR PLAN', code: 'I-101  1:50', ring: 6 }],
    ],
  },
  'kavir-observatory': {
    pal: 'desert',
    images: [
      ['hero', 'observatory', A.hero, 81, {}],
      ['night', 'observatory', A.port, 82, {}],
      ['tower', 'tower', A.heroTall, 83, { volumes: 5 }],
      ['dunes', 'terraces', A.wide, 84, { levels: 3 }],
      ['section', 'section', A.land, 85, { title: 'SECTION THROUGH DOME', code: 'A-310  1:100', levels: 5 }],
    ],
  },
}
// "night" variants use the dusk palette for drama
const PAL_OVERRIDE = { 'kavir-observatory/night': 'dusk', 'hormuz-shore-walk/dusk': 'dusk', 'meridian-pavilion/interior': 'clay', 'zagros-lodge/room': 'dawn' }

async function render(slug, name, scene, [w, h], seed, opts, palName) {
  const pal = PAL[PAL_OVERRIDE[`${slug}/${name}`] ?? palName]
  const rng = rngFor(seed * 7919)
  const body = SCENES[scene](w, h, pal, rng, opts)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs><filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="${seed}" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.9 -0.35"/></filter>
<radialGradient id="vig" cx="50%" cy="50%" r="75%"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.22"/></radialGradient></defs>
${body}
<rect width="${w}" height="${h}" fill="url(#vig)"/>
<rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.5"/></svg>`
  const dir = path.join(outDir, slug)
  await mkdir(dir, { recursive: true })
  const file = path.join(dir, `${name}.jpg`)
  const base = sharp(Buffer.from(svg))
  await base.clone().jpeg({ quality: 80, mozjpeg: true, chromaSubsampling: '4:4:4' }).toFile(file)
  const tiny = await base.clone().resize(10).jpeg({ quality: 50 }).toBuffer()
  const stats = await sharp(Buffer.from(svg)).resize(1, 1).raw().toBuffer()
  return {
    src: `/media/${slug}/${name}.jpg`,
    width: w,
    height: h,
    blurDataURL: `data:image/jpeg;base64,${tiny.toString('base64')}`,
    tone: toHex([stats[0], stats[1], stats[2]]),
  }
}

const only = process.argv.slice(2)
const manifest = {}
for (const [slug, cfg] of Object.entries(SET)) {
  if (only.length && !only.includes(slug)) continue
  for (const [name, scene, size, seed, opts] of cfg.images) {
    const t = Date.now()
    manifest[`${slug}/${name}`] = await render(slug, name, scene, size, seed, opts, cfg.pal)
    console.log(`${slug}/${name} ${size.join('x')} ${Date.now() - t}ms`)
  }
}
let merged = manifest
if (only.length) {
  try {
    const { readFile } = await import('node:fs/promises')
    merged = { ...JSON.parse(await readFile(manifestPath, 'utf8')), ...manifest }
  } catch {
    merged = manifest
  }
}
await mkdir(path.dirname(manifestPath), { recursive: true })
const sorted = Object.fromEntries(Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)))
await writeFile(manifestPath, JSON.stringify(sorted, null, 2) + '\n')
console.log(`manifest: ${Object.keys(sorted).length} images`)
