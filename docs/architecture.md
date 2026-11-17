# Architecture

Immersive bilingual (fa/en, RTL/LTR) architecture portfolio, modelled on the interaction of
big.dk as inspected in [reference-inspection.md](./reference-inspection.md).

## 1. The experience in one paragraph

`/{locale}/projects` is one long vertical page of projects (a centred column of images with a
caption in the inline-start gutter). Selecting a project does **not** navigate to a new page: the
selected row grows in place, the *same* image element becoming the hero of a long horizontal
story (text, quotes, photographs, diagrams, facts, credits, related projects). The URL changes
to `/{locale}/projects/{slug}` via `history.pushState`; Back/Forward, Esc and the close button
all reconcile through that one URL.

## 2. Routing and state

| Concern | Decision |
| --- | --- |
| Routes | `app/[locale]/projects/[[...slug]]/page.tsx` — one page component for the overview *and* every project, statically generated for every locale × slug (`generateStaticParams`), so every URL is a real, shareable, SSR'd page. |
| Source of truth | The **URL**. `activeSlug = slugFromPath(usePathname())`. Animation state is derived from it and never the reverse. |
| In-app navigation | Native `history.pushState` (officially integrated with the App Router, keeps `usePathname` in sync). No RSC round-trip, so the transition starts immediately and the experience never remounts. |
| Back/Forward/Esc/Close | Close = `history.back()` when the project was opened from the overview in-app (exact inverse), else `pushState` to the overview. Back/Forward change the URL → the same `go(slug)` path runs. |
| Direct URL | SSR renders the row already open (`--p: 1`, panels mounted); the engine only *places* it in the viewport, no animation. |
| Language switch | Soft `<Link>` navigation (no document reload). The `[locale]` segment sits above the experience so it remounts; `lib/view-state.ts` carries slug, page scroll and strip position (as a 0..1 fraction, so LTR/RTL sign differences don't matter) across the switch. |
| Locale negotiation | `src/proxy.ts` (Next 16 "proxy") redirects un-prefixed paths by `Accept-Language`; default `en`. |

## 3. Animation architecture (the cinematic zoom)

Chosen: **in-place row expansion driven by one number per row**, not a cloned-image FLIP.

* Each row has `--p` (0 closed … 1 open), tweened by GSAP. CSS derives *everything* from it with
  `calc()`: row height, hero width, strip lead-in (`experience.module.css`). Breakpoints only
  redefine the *inputs* (`--w0`, `--h1-fit`, `--wmax`…), never the formulas.
* The hero is the same DOM node before, during and after. `object-fit: cover` absorbs the
  changing box, so the crop evolves continuously — no swap, no second image, no extra download.
* While rows resize, the selected row would drift on screen. Each frame the engine measures it
  and corrects window scroll so it follows a prescribed path (current → resting). That is the
  FLIP job, done continuously, and it also handles "another row collapsing above".
* Strip content (metadata, panels) is revealed with GSAP opacity/transform only, after the
  geometry is ~half done, entering from the **inline-end** side.
* One timeline alive at a time; `go()` always kills the previous one and tweens from the *current*
  `p`, so interruptions (Back mid-open, repeated clicks) never snap.
* State machine (`data-phase`): `overview → entering → active → exiting → overview`. UI clicks are
  ignored while `engine.busy`; URL changes (Back/Forward) are never ignored — they interrupt.
* Reader input mid-transition (wheel/touch/keys) cancels the engine's scroll steering.
* Reduced motion: geometry jumps, content cross-fades in 150–250 ms, no overview zoom.

Why not GSAP Flip? Flip morphs between two *different* elements/states. Here the destination is the
same element in the same container, and the layout around it changes too (rows above/below), so a
per-frame anchored geometry tween is simpler and more robust. GSAP is the only animation library.

Overview "zoom-out while scrolling" (`useScrollZoom`): transform-only, scroll-velocity driven,
disabled on touch/coarse pointers, reduced motion, and while a project is open or transitioning.

## 4. Horizontal exploration

Model: reference's **Option A** (native `overflow-x` strip nested in the vertical page) plus a
*local* wheel handler — a controlled hybrid.

* Native scrolling stays the engine: touch swipes, trackpad deltaX, scrollbar, focus scrolling.
* Mouse wheel over the open strip → horizontal movement, **only** for wheel-like events (line
  mode / coarse integer notches ≥ 50), **only** while the strip can still move that way. At either
  end the event falls through to the page: no dead ends. Trackpad-style small deltas are never
  touched. No global wheel listener; handlers live on the one active scroller.
* Mouse-only drag-to-scroll (swallows the trailing click). `overscroll-behavior-x: contain`
  stops edge swipes from triggering browser back-swipe.
* Keyboard: arrows follow the reading direction, Home/End when focus is in the strip, Esc closes.
  Panel stepping buttons use the same code (`useStripInput.step`).
* Panels are data-driven (`Panel` union in `content/types.ts`) and sized from the live row height
  `--H`, with a per-panel vertical rhythm (start / centre / end) so it never reads as a template.

## 5. i18n and RTL/LTR — explicit decisions

Architecture: typed dictionaries (`i18n/dictionaries`, Persian must satisfy English's type),
`{placeholder}` templates, locale-aware formatting (`Intl`: Persian digits, Solar Hijri years),
content localised **on the server** so only one language ships (`content/localize.ts`).

The brief asks to separate layout direction from storytelling direction. Decisions, all tested:

1. **Exploration direction**: the story flows along the *inline* axis — left→right in English,
   right→left in Persian. The strip *starts* at the inline-start edge (native `direction` does this).
2. **Entrance origin**: content is revealed entering from inline-end (right in LTR, left in RTL).
3. **Previous/next**: "next" points along reading direction. Arrow glyph is mirrored in RTL via
   `scaleX(var(--dir))`; keys: `→` advances in LTR, `←` in RTL.
4. **Exit controls**: close sits at inline-start of the bottom bar; menu panel slides from inline-start.
5. **Text vs image order**: DOM/story order is identical in both locales (verified by unit test:
   image `src` sequence equal). Photographs are **not** reordered by language; the *visual* flow
   mirrors with direction. Caption/metadata column is on the inline-start side of the hero.
6. **Wheel/touch**: wheel-down = forward in both locales (maps to `−scrollLeft` in RTL). Swipe
   toward inline-start = forward. All scroll maths is in `lib/inline-scroll.ts` as *logical*
   positions (0 = start), because browsers report negative `scrollLeft` in RTL.
7. **Directional icons / progress**: progress bar grows from the strip start (`transform-origin`
   flips); counter/arrows mirror.

Styling rule: logical properties only (`inline-start/end`, `text-align: end`, `inset-inline-*`).
Physical left/right appear only where the physical axis is the point (scroll maths, the `--dir`
sign for translations). Persian: Vazirmatn, `letter-spacing: 0` enforced (it breaks joining),
taller line-height, no uppercase transforms.

Mixed script: `<Bidi>` wraps Latin runs (names, standards, units, e-mail) in `<bdi dir="ltr">` in
RTL locales; `<Ltr>` isolates e-mails, phones, coordinates. Unit-tested, and it caught a real bug
(a trailing `)` swallowed into an isolate).

## 6. Content model

`content/types.ts`: `Project` (id, slug, category, typology, status, year, area, localized title/
location/client/descriptions, thumbnail, hero, facts, panels, related). `Panel` is a discriminated
union: `intro | image | imagePair | quote | diagram | facts | context | credits | related`, plus a
derived `summary` panel (short + full description + facts) always first. One canonical source feeds
overview, transition and strip. `thumbnail` deliberately *is* the hero asset: the zoom grows the
same pixels, so nothing extra is downloaded.

## 7. Imagery

There is no licensed photography in the repo and the reference's assets must not be copied.
`scripts/generate-images.mjs` renders **original, deterministic illustrations** (SVG → JPEG via
sharp) and a manifest (`src/content/image-manifest.json`: size, blur placeholder, average colour).
Replace files in `public/media/**` with authorised photography and keep the manifest keys.
`next/image` serves AVIF/WebP with `sizes` matched to the layouts; the first three rows load eagerly,
the rest lazily; nothing is preloaded wholesale.

## 8. Accessibility

Real links (`<a href>`) for every project; `aria-current` on the open one; open strip is a labelled
`region` with `tabindex=0`; nothing is `inert`/`aria-hidden` while a project is open; polite live
region announces open/close; focus returns to the project link after closing; menu is a modal dialog
with focus trap and focus restoration; skip link; 44 px touch targets; focus ring painted *over*
images (a naive outline was hidden under the picture — found and fixed during QA).

## Content source (backend integration)

`src/content/source.ts` is the one place pages ask for content (`getProjects`, `getSite`, `getStaticParams`). With `CONTENT_SOURCE=static` (default) it returns
the built-in dataset localized as before; with `CONTENT_SOURCE=api` it fetches `/api/v1/{locale}/projects?include=story` and `/api/v1/{locale}/site`
(`src/content/api.ts`, `site.ts` map the answers to the same `ProjectView`/`PanelView` types, so no component changed its data shape), cached under the
`content` tag. `POST /api/revalidate` (`src/app/api/revalidate/route.ts`, logic in `src/lib/revalidate.ts`) verifies an HMAC over `<timestamp>.<raw body>`,
rejects stale timestamps and expires that tag. The locale layout and the projects page use `dynamicParams = true` so an expired or newly added page can be rendered
on demand (`false` makes an expired page answer 404); unknown locales and slugs still end in `notFound()`. In `api` mode pages are sent with `Cache-Control: no-cache`.

