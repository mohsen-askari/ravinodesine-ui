import Link from 'next/link'
import './globals.css'

// Rendered for URLs that match no route (outside any locale). Kept bilingual because the
// locale cannot be known here.
export default function GlobalNotFound() {
  return (
    <html lang="en" dir="ltr">
      <body style={{ minHeight: '100svh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
        <main>
          <h1 style={{ fontWeight: 400, fontSize: 40 }}>404</h1>
          <p style={{ color: '#727272' }}>Page not found · صفحه پیدا نشد</p>
          <p style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 24 }}>
            <Link href="/en/projects" style={{ textDecoration: 'underline' }}>
              Projects
            </Link>
            <Link href="/fa/projects" lang="fa" style={{ textDecoration: 'underline' }}>
              پروژه‌ها
            </Link>
          </p>
        </main>
      </body>
    </html>
  )
}
