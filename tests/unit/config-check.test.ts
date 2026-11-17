import { describe, expect, it } from 'vitest'
import { configurationProblems } from '@/lib/config-check'

const good = { CONTENT_SOURCE: 'api', RAVINO_API_URL: 'https://cms.example.com', RAVINO_REVALIDATE_SECRET: 'a'.repeat(40), NODE_ENV: 'production' }

describe('start-up configuration check', () => {
  it('has nothing to say about static mode, with or without anything else set', () => {
    expect(configurationProblems({})).toEqual([])
    expect(configurationProblems({ CONTENT_SOURCE: 'static' })).toEqual([])
    expect(configurationProblems({ NODE_ENV: 'production' })).toEqual([])
  })

  it('accepts a complete api configuration, with or without a previous secret during rotation', () => {
    expect(configurationProblems(good)).toEqual([])
    expect(configurationProblems({ ...good, RAVINO_REVALIDATE_SECRET_PREVIOUS: 'b'.repeat(32) })).toEqual([])
  })

  it.each([
    ['an unknown mode', { CONTENT_SOURCE: 'API' }, /CONTENT_SOURCE/],
    ['no API address', { ...good, RAVINO_API_URL: '' }, /RAVINO_API_URL is missing/],
    ['an API address that is not a URL', { ...good, RAVINO_API_URL: 'cms.example.com' }, /RAVINO_API_URL is missing/],
    ['plain http in production', { ...good, RAVINO_API_URL: 'http://cms.example.com' }, /not https/],
    ['no webhook secret', { ...good, RAVINO_REVALIDATE_SECRET: undefined }, /RAVINO_REVALIDATE_SECRET is not set/],
    ['a short secret', { ...good, RAVINO_REVALIDATE_SECRET: 'short' }, /RAVINO_REVALIDATE_SECRET is shorter/],
    ['a short previous secret', { ...good, RAVINO_REVALIDATE_SECRET_PREVIOUS: 'short' }, /RAVINO_REVALIDATE_SECRET_PREVIOUS is shorter/],
    ['the local-media switch in production', { ...good, RAVINO_ALLOW_LOCAL_MEDIA: 'true' }, /local development only/],
  ])('reports %s', (_name, env, message) => {
    expect(configurationProblems(env).join('\n')).toMatch(message)
  })

  it('does not warn about plain http outside production, and never repeats a secret value', () => {
    expect(configurationProblems({ ...good, NODE_ENV: 'development', RAVINO_API_URL: 'http://127.0.0.1:8000' })).toEqual([])
    const secret = 'S3cretS3cretS3cretS3cretS3cretS3cret'
    const text = configurationProblems({ ...good, RAVINO_REVALIDATE_SECRET: secret.slice(0, 8), RAVINO_REVALIDATE_SECRET_PREVIOUS: secret.slice(0, 5) }).join('\n')
    expect(text).not.toContain(secret.slice(0, 5))
  })
})
