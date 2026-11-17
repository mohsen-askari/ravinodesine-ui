# Ravino — immersive bilingual architecture portfolio

Next.js 16 (App Router) · React 19 · TypeScript · GSAP · CSS Modules. Persian (RTL) and English (LTR).
Interaction inspired by big.dk; see `docs/` for the inspection record, architecture and test report.

```bash
npm install
npm run dev            # http://localhost:3000  (redirects to /en or /fa by Accept-Language)
npm run build && npm start
npm run typecheck && npm run lint && npm test
npm run test:e2e       # Playwright against the production build (:3101)
npm run images         # regenerate the placeholder illustrations (scripts/generate-images.mjs)
```

* `docs/reference-inspection.md` – what was observed on big.dk vs. my own decisions
* `docs/architecture.md` – routing, transition engine, horizontal model, RTL decisions
* `docs/testing.md` – results, measurements, limitations, manual checklist

Imagery is original generated illustration (no licensed photos in the repo). Replace
`public/media/**` with authorised photography and keep the keys in `src/content/image-manifest.json`.
Optional env: `NEXT_PUBLIC_SITE_URL` (canonical/sitemap base).

### Content source (backend integration)

By default the site renders its built-in dataset (`CONTENT_SOURCE=static`). With `CONTENT_SOURCE=api` it reads the Ravino backend's public API
(`RAVINO_API_URL`) and refreshes when the backend sends a signed webhook to `POST /api/revalidate` (`RAVINO_REVALIDATE_SECRET`).
Environment variables, deployment, the scheduler requirement and the verification procedure: [`../docs/implementation/frontend-integration.md`](../docs/implementation/frontend-integration.md).

```bash
npm run test:e2e:api   # API-mode build against a mock API, drives the webhook (writes only to .next-api)
```
# ravinodesine-ui
