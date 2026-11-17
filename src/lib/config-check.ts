// No Node-only imports here: src/instrumentation.ts is bundled for the Edge runtime too.
export const MIN_SECRET_BYTES = 32
const byteLength = (value: string) => new TextEncoder().encode(value).length

/**
 * Problems with the environment that would leave the site running but misbehaving (for example in `api` mode without a
 * webhook secret, so changes only show up at the hourly refresh). Reported once at start-up (src/instrumentation.ts);
 * they are logged, not fatal, so that setting CONTENT_SOURCE=static as a rollback never needs anything else.
 */
export function configurationProblems(env: Record<string, string | undefined> = process.env): string[] {
  const problems: string[] = []
  const mode = (env.CONTENT_SOURCE ?? '').trim()
  if (mode !== '' && mode !== 'static' && mode !== 'api') problems.push(`CONTENT_SOURCE must be "static" or "api", not "${mode}".`)

  if (mode === 'api') {
    try {
      const url = new URL((env.RAVINO_API_URL ?? '').trim())
      if (url.protocol !== 'https:' && env.NODE_ENV === 'production') problems.push('RAVINO_API_URL is not https:// (acceptable only on a private network).')
    } catch {
      problems.push('RAVINO_API_URL is missing or not a URL.')
    }
    if (!env.RAVINO_REVALIDATE_SECRET) problems.push('RAVINO_REVALIDATE_SECRET is not set: the backend webhook will be refused (503) and changes will only appear at the hourly refresh.')
    for (const name of ['RAVINO_REVALIDATE_SECRET', 'RAVINO_REVALIDATE_SECRET_PREVIOUS'] as const) {
      const value = env[name]
      if (value && byteLength(value) < MIN_SECRET_BYTES) problems.push(`${name} is shorter than ${MIN_SECRET_BYTES} bytes: every webhook will be refused.`)
    }
  }
  if (env.RAVINO_ALLOW_LOCAL_MEDIA === 'true' && env.NODE_ENV === 'production') problems.push('RAVINO_ALLOW_LOCAL_MEDIA=true is meant for local development only; the image optimizer can then be pointed at private addresses.')
  return problems
}
