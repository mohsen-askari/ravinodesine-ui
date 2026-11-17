# Test results, limitations, manual checklist

Last full run (Node 22.16, Chromium 1243 via Playwright 1.63, production build):

| Check | Result |
| --- | --- |
| `npm run typecheck` (tsc) | pass |
| `npm run lint` (eslint, Next 16 + react-hooks rules) | pass, 0 problems |
| `npm test` (vitest) | 65 / 65 |
| `npm run build` | pass, 26 static pages (2 locales × overview + 8 projects + studio + contact + redirects) |
| `npm run test:e2e` | 85 / 85 (75 desktop 1440×900, 10 mobile Pixel 7) |

Run: `npm run build && npm run test:e2e` (starts `next start` on :3101 automatically).

## What is covered

* **Unit**: content integrity in both locales (every field present, Persian is Persian script,
  images exist on disk, related links valid, identical panel/image order across locales),
  dictionary key + placeholder parity, formatting (Persian digits, Solar Hijri), `<Bidi>`
  isolation, RTL/LTR scroll maths, locale negotiation.
* **E2E – locale/direction**: `lang`/`dir`, redirects, mirrored header/captions, direct URLs,
  404s, mixed-script isolation, per-locale typeface loaded, language switch keeps project +
  vertical position + strip position, no document reload, Back/Forward across languages.
* **E2E – transition**: per-frame sampling of the hero: no blank frame, same `<img>` node,
  monotonic growth, bounded speed, bounded position jumps; content hidden until geometry has
  progressed; Esc/Close/Back/Forward; scroll restoration; repeated and conflicting clicks;
  interrupted transition; related-project switch.
* **E2E – exploration**: arrows/buttons/Home/End, wheel → horizontal, edge fall-through, trackpad
  deltas not hijacked, drag, native deltaX, RTL sign + arrow mirroring + bar origin + reveal side.
* **E2E – robustness**: no clipped content at 9 viewports × 2 locales × 8 projects (including
  landscape phone), no horizontal page overflow.
* **E2E – a11y/motion**: axe scans (overview + open, both locales), keyboard operability, focus
  return, visible focus ring on images, reduced-motion behaviour.
* **E2E – mobile**: stacked layout, tap-to-open, **real touch gestures** (CDP touch events) in both
  directions, vertical swipe passes through, 44 px controls.

## Measured performance (production build, local)

| | Desktop | Pixel 7, 4× CPU throttle |
| --- | --- | --- |
| LCP | 132 ms | 180–240 ms |
| CLS | 0.0004 | 0 |
| Open transition frames | p50 16.7 ms, p95 16.8 ms, 0 > 33 ms | p95 16.8 ms, 1 frame > 50 ms |
| Initial images | 8 requests, 66 KB | same |

## Known limitations (honest list)

* **Imagery is generated illustration, not photography.** Weights (66 KB for 8 images) are far
  smaller than real photos; re-measure after swapping in real assets.
* **One ~140 ms main-thread task at the start of opening on throttled mobile** (React mounting the
  strip) *before* the tween begins. No dropped frames mid-motion, but on slow phones the response
  to a tap is ≈150 ms. Mitigation idea: mount the strip on pointer-down/hover.
* **Wheel heuristic**: wheel-like = line mode or integer deltas ≥ 50. A high-resolution mouse with
  small smooth deltas is treated like a trackpad (native vertical scroll, no horizontal mapping).
* **Not tested**: Safari/WebKit and Firefox (only Chromium is installed here); real devices; screen
  readers (axe is automated only); the reference's loading splash is not reproduced; timing/easing
  are tuned by eye and are **not** claimed to match the reference (only its row-height transition
  curve and duration were observed).
* `Input.synthesizeScrollGesture` does nothing in this headless setup, even on a trivial page;
  mobile tests therefore use raw CDP touch events, which do trigger genuine native scrolling.
* The reference has no exit control, Esc handling, or reliable history; those are deliberate
  additions here, not replication.
* Sharing buttons: copy-link and e-mail only (no social SDKs).

## Manual verification checklist

Desktop, English (LTR) and Persian (RTL) — repeat each item in both:
- [ ] `/en/projects` and `/fa/projects` load; caption sits on the inline-start side of each image.
- [ ] Click a project: image grows in place, page glides it to centre, metadata then text appear.
- [ ] Wheel over the strip moves it; at the end the page scrolls on. Arrow keys, buttons, drag work.
- [ ] Esc / Close / browser Back return to the same overview position; Forward reopens.
- [ ] Open `/…/projects/<slug>` directly; refresh; share the link.
- [ ] Switch language while a project is open: same project, same reading position.
- [ ] OS "reduce motion" on: no zoom, short cross-fade, everything still works.
Mobile (portrait + landscape):
- [ ] Stacked images with captions below; tap opens; swipe moves through the story; vertical swipe
      still scrolls the page; close button reachable.
