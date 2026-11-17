import type { NextConfig } from 'next'

/**
 * Images served by the backend (CONTENT_SOURCE=api) must come from a host the optimiser is allowed to fetch from:
 * RAVINO_MEDIA_URL if media lives elsewhere (a CDN or bucket), otherwise the API's own address. Only that origin is
 * allowed, over its own protocol. In static mode nothing remote is allowed.
 */
function mediaPatterns(): NonNullable<NextConfig['images']>['remotePatterns'] {
  if (process.env.CONTENT_SOURCE !== 'api') return []
  const raw = process.env.RAVINO_MEDIA_URL || process.env.RAVINO_API_URL
  if (!raw) throw new Error('CONTENT_SOURCE=api needs RAVINO_API_URL (and RAVINO_MEDIA_URL when images are served from another host).')
  const url = new URL(raw)
  return [{ protocol: url.protocol === 'http:' ? 'http' : 'https', hostname: url.hostname, port: url.port, pathname: '/**' }]
}

if (process.env.RAVINO_ALLOW_LOCAL_MEDIA === 'true') console.warn('[config] RAVINO_ALLOW_LOCAL_MEDIA=true: images may be fetched from private addresses. Local development only.')

const nextConfig: NextConfig = {
  // The API-mode end-to-end test builds into its own folder so it never overwrites the normal build.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  devIndicators: false,
  experimental: {
    // Needed because there is no root layout above app/[locale].
    globalNotFound: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    // Generated portfolio imagery is served from /public; widths mirror the
    // layouts in the experience (mobile 90vw, desktop strip panels, hero).
    deviceSizes: [420, 640, 828, 1080, 1440, 1920, 2560],
    imageSizes: [96, 160, 256, 384, 560],
    remotePatterns: mediaPatterns(),
    // Next refuses to fetch images from loopback/private addresses. Only for developing or testing against a backend
    // on this machine; never set it in production.
    dangerouslyAllowLocalIP: process.env.RAVINO_ALLOW_LOCAL_MEDIA === 'true',
  },
  headers: async () => [
    // With CONTENT_SOURCE=api the pages are ISR pages that the webhook refreshes. Their default header
    // (s-maxage + a year of stale-while-revalidate) lets a browser or CDN keep serving an old copy that no webhook can
    // purge, and it makes Chromium stall repeat visits on its HTTP-cache lock. "no-cache" means: always ask this server,
    // which answers 304 from its own cache when nothing changed.
    ...(process.env.CONTENT_SOURCE === 'api'
      ? [
          { source: '/:locale(en|fa)/:path*', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
          { source: '/:locale(en|fa)', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
        ]
      : []),
    {
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
  ],
}

export default nextConfig
