import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { projectExists } from '@/content/known-projects'
import { defaultLocale, isLocale } from '@/i18n/config'
import type { Locale } from '@/i18n/config'

/** Picks the best supported locale from Accept-Language ("fa-IR,fa;q=0.9,en;q=0.5"). */
function negotiate(header: string | null): Locale {
  if (!header) return defaultLocale
  const ranked = header
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=')
      return { tag: tag.toLowerCase(), q: q ? Number(q) : 1 }
    })
    .sort((a, b) => b.q - a.q)
  for (const { tag } of ranked) {
    const base = tag.split('-')[0]
    if (isLocale(base)) return base
  }
  return defaultLocale
}

/**
 * The same bilingual 404 as src/app/global-not-found.tsx, answered directly. A rewrite to an address that matches no route
 * would be tidier, but Next relativizes a rewrite against its own address and treats it as an external one when the
 * origin differs, which it does behind a reverse proxy (Host / X-Forwarded-Proto): every such request then failed with a 500.
 */
const NOT_FOUND_HTML = `<!doctype html><html lang="en" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>404</title></head><body style="margin:0;min-height:100svh;display:grid;place-items:center;padding:24px;text-align:center;font-family:system-ui,sans-serif"><main><h1 style="font-weight:400;font-size:40px">404</h1><p style="color:#727272">Page not found · صفحه پیدا نشد</p><p style="display:flex;gap:24px;justify-content:center;margin-top:24px"><a href="/en/projects" style="text-decoration:underline;color:inherit">Projects</a><a href="/fa/projects" lang="fa" style="text-decoration:underline;color:inherit">پروژه‌ها</a></p></main></body></html>`

function notFound(): NextResponse {
  return new NextResponse(NOT_FOUND_HTML, { status: 404, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache', 'x-robots-tag': 'noindex' } })
}

/**
 * `/{locale}/projects/{x}` with an `x` that is not a project (or more segments than that) is answered with a 404 here,
 * before the page cache; see known-projects.ts.
 */
async function isMadeUpProjectPath(locale: Locale, parts: string[]): Promise<boolean> {
  if (parts[2] !== 'projects') return false
  const rest = parts.slice(3)
  if (rest.at(-1) === '') rest.pop() // a trailing slash
  if (rest.length === 0) return false // the overview
  if (rest.length > 1) return true
  try {
    return !(await projectExists(locale, decodeURIComponent(rest[0])))
  } catch {
    return true // not even valid percent-encoding
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const parts = pathname.split('/')
  const first = parts[1]
  if (isLocale(first)) {
    if (await isMadeUpProjectPath(first, parts)) return notFound()
    return NextResponse.next()
  }

  const locale = negotiate(request.headers.get('accept-language'))
  const url = request.nextUrl.clone()
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`
  return NextResponse.redirect(url)
}

export const config = {
  // Skip route handlers (/api/...: the signed revalidation webhook must not be redirected), Next internals, generated
  // media and any path with a file extension.
  matcher: ['/((?!api/|_next|media|favicon.ico|.*\\..*).*)'],
}

