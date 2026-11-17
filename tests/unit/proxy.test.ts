import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'
import { proxy } from '@/proxy'

const go = (path: string, acceptLanguage?: string) =>
  proxy(new NextRequest(`http://localhost:3000${path}`, { headers: acceptLanguage ? { 'accept-language': acceptLanguage } : {} }))

describe('locale proxy', () => {
  it('passes localized paths through', async () => {
    expect((await go('/fa/projects'))!.headers.get('location')).toBeNull()
    expect((await go('/en'))!.headers.get('location')).toBeNull()
  })
  it('redirects the root by Accept-Language, honouring q-values', async () => {
    expect((await go('/', 'fa-IR,fa;q=0.9,en;q=0.5'))!.headers.get('location')).toBe('http://localhost:3000/fa')
    expect((await go('/', 'en-US,en;q=0.9,fa;q=0.8'))!.headers.get('location')).toBe('http://localhost:3000/en')
    expect((await go('/', 'de;q=0.9,fa;q=0.7'))!.headers.get('location')).toBe('http://localhost:3000/fa')
  })
  it('falls back to English', async () => {
    expect((await go('/'))!.headers.get('location')).toBe('http://localhost:3000/en')
    expect((await go('/', 'ja,zh;q=0.8'))!.headers.get('location')).toBe('http://localhost:3000/en')
  })
  it('keeps the rest of the path when adding the locale', async () => {
    expect((await go('/projects/zagros-lodge', 'fa'))!.headers.get('location')).toBe('http://localhost:3000/fa/projects/zagros-lodge')
  })
})
