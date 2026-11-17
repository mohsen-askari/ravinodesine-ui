# Reference inspection — big.dk

Inspected 2026-10-21 with Playwright + Chromium 1243 (desktop 1440×900, mobile
390×844 touch emulation) against the live site. Observed facts and my own
assumptions are kept apart on purpose. No code or asset from the reference is
used in this project; behaviour was observed and re-implemented independently.

## A. Observed behaviour (verified in a real browser)

### Overview (desktop, ≥1024px)
- **A single centred column** of project images, stacked vertically, each at its
  own native aspect ratio (4400/2288, 1:1, …). At rest an image is ≈433px wide at
  a 900px-tall viewport (= 64vh × a resting scale of 0.752).
- **Caption block sits in the inline-start gutter**, right-aligned toward the
  image: a 50px black square icon, the title (18px), and an UPPERCASE grey
  location line.
- **Chrome is minimal**: logo at the top-left, five category links centred,
  a search/filter text at the right. The nav is white-backed and overlays the
  page; the page itself is one very long vertical scroll (≈119,000px).
- Images load with an 8px blurred inline placeholder (LQIP) under a lazily
  decoded real image. Desktop shows a black cover that slides away on first load;
  mobile shows a black splash with the logo.
- **Scroll-velocity zoom**: while the user scrolls the whole stack scales down
  (zoom-out) in proportion to scroll speed, then relaxes back to its resting scale
  once scrolling stops (readable from the shipped client bundle's tween values,
  not from timings I measured myself). Disabled below 1024px.

### Selecting a project
- Clicking an image **does not navigate to a new page**. The selected row expands
  **in place**: the image grows (row height transitions to 76vh with
  `cubic-bezier(0.45, 0, 0.55, 1)` over 0.78s — read from the inline style),
  a metadata column (client, typology, size, status, share) fades in to the
  image's inline-start side, and a horizontal strip (text, quote, images, credits)
  extends from the image toward inline-end, bleeding off-screen.
- Other rows stay in the page; rows below are pushed down. There is no overlay,
  no page swap, and no blank frame.
- `history.pushState` updates the URL to `/projects/<slug>-<id>`; the logo
  morphs from "BIG" into a hamburger (the hamburger opens a left menu).
- Frames captured ≈70ms apart: image grows from 433px to 514px, caption and the
  hero shift ≈41px inline-start as the strip appears, the metadata fades in last,
  the strip content appears last.

### Horizontal strip
- The row is a native `overflow-x: scroll` flex container with the scrollbar
  hidden (no scroll snapping). Strip width for the sampled project ≈ 17,000px.
- Contents in order: hero image + meta column, long text, pull quote, portrait
  images, wide landscape images (varied sizes, not a template), and a credits list
  in three columns at the end.
- **Vertical wheel scrolls the page; horizontal wheel/trackpad (deltaX) scrolls the
  strip.** Vertical wheel is *not* converted to horizontal movement — a
  mouse-only user has no obvious way to move through the strip.
- Arrow keys scroll the strip a small native amount (≈40px). Escape does **not**
  close the project. Clicking the open hero again does **not** close it. There is
  no visible exit control; opening another project is how the state changes.
- A synthetic mouse drag on the strip did not scroll it.
- Touch: a native horizontal swipe scrolls the strip (scrollLeft moved 240px).

### Browser history
- Each open pushes history entries. Back/Forward behaved inconsistently in my test
  (a `goBack` timed out waiting for navigation), so I treat the reference's
  history behaviour as not a model to follow.

### Mobile (390px)
- Images are ≈90vw wide with the caption **below** the image (icon + title +
  location), stacked vertically.
- Opening a row expands it in place to a short strip (≈233px tall at 390px wide):
  meta (client/typology/size) beside the image, then description text, then more
  images. Horizontal swipe scrolls the strip natively.
- A hamburger/filter icon sits at the top-right; the menu is a left-hand panel.

## B. Not observable / not measured
- Exact easing/timing of the scroll-velocity zoom as experienced (only its
  tween parameters, read from code), the loader's exact duration, GPU cost.
- Their language handling (the site is English only; there is no RTL reference).
- Pixel-level positions of every strip panel.

## C. Deliberate decisions where the reference is silent or deficient
| Topic | Reference | This project |
| --- | --- | --- |
| Exit | none | explicit close control, Escape, Back button |
| Mouse wheel in strip | no horizontal mapping | wheel over the strip moves it horizontally; edges pass through to the page |
| Mouse drag | not working | pointer-drag scrolling on desktop mouse input only |
| Hero in open state | square crop | continuous `object-fit: cover` box so crop changes smoothly |
| Keyboard | native small step | panel-wise Arrow/PageUp/PageDown/Home/End |
| Language | EN only | EN (LTR) + FA (RTL) with mirrored composition |
| History | flaky | URL is the source of truth; Back/Forward re-derive state |
| Reduced motion | not observed | short cross-fade, no zoom |

## D. Mapping to the scroll-architecture options
The reference is **Option A (native horizontal overflow, nested in a vertical
page)**. This project uses a **controlled hybrid of A**: native overflow remains
the single scroll engine for touch/trackpad/keyboard, and a *local* (not global)
wheel handler converts mouse-wheel input into horizontal movement only while the
pointer is over an open strip and only when the strip can move in that direction.

## E. Fidelity summary (this implementation vs. the reference)

| Aspect | Status |
| --- | --- |
| Centred image column, caption in inline-start gutter | reproduced (measured: 433 px @ 900 px viewport in the reference; mine ≈ 414 px, own sizing) |
| In-place row expansion, same image grows, strip extends inline-end | reproduced |
| Native horizontal overflow strip, hidden scrollbar | reproduced |
| Scroll-velocity zoom-out in the overview | reproduced in spirit; range/rest-scale are my own |
| Row-height curve `cubic-bezier(.45,0,.55,1)` / 0.78 s | **not** used; mine is GSAP `power3.inOut` ≈ 1.0 s, tuned by eye |
| Mobile: stacked images, caption below, native swipe | reproduced |
| Black loading splash | not reproduced (deliberately: the brief discourages loading screens) |
| Exit control, Esc, wheel→horizontal, drag, reliable history | added (absent/unreliable in the reference) |
| RTL / Persian | no reference exists; designed and tested independently |
