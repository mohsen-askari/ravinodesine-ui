// Builds the site in API mode against the mock API, starts it, runs the webhook tests, and cleans up.
// The secret below exists only for this run; it is generated here and never written anywhere.
import { spawn } from 'node:child_process'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { startMockApi } from '../tests/fixtures/mock-api.mjs'

const MOCK_PORT = 4010
const SITE_PORT = 3104
const secret = randomBytes(32).toString('hex')
const env = {
  ...process.env,
  CONTENT_SOURCE: 'api',
  RAVINO_API_URL: `http://127.0.0.1:${MOCK_PORT}`,
  RAVINO_MEDIA_URL: 'https://cms.ravino.test',
  RAVINO_REVALIDATE_SECRET: secret,
  NEXT_DIST_DIR: '.next-api',
  E2E_API_PORT: String(SITE_PORT),
  E2E_MOCK_PORT: String(MOCK_PORT),
  NO_PROXY: 'localhost,127.0.0.1',
  no_proxy: 'localhost,127.0.0.1',
}

// Not spawnSync: the mock API runs in this process and must keep answering while the build asks it for content.
const run = (args) => new Promise((resolve) => spawn('npx', args, { env, stdio: 'inherit' }).on('exit', (status) => resolve(status ?? 1)))

// `next build` rewrites tsconfig.json when distDir is not .next; put it back afterwards so the repository stays untouched.
const tsconfig = readFileSync('tsconfig.json', 'utf8')

// A clean build every time: the previous run's cached API responses must not leak into this one.
rmSync('.next-api', { recursive: true, force: true })

if (await fetch(`http://127.0.0.1:${SITE_PORT}/`).then(() => true).catch(() => false)) throw new Error(`Port ${SITE_PORT} is already in use: stop the old server first.`)

const mock = await startMockApi(MOCK_PORT)
let site
let code = 1
try {
  if ((await run(['next', 'build'])) !== 0) throw new Error('build failed')
  // Own process group, so the whole tree (npx, sh, next-server) can be stopped at the end.
  site = spawn('npx', ['next', 'start', '-p', String(SITE_PORT), '-H', '127.0.0.1'], { env, stdio: 'ignore', detached: true })
  for (let i = 0; i < 60; i++) {
    const ready = await fetch(`http://127.0.0.1:${SITE_PORT}/en/projects`).then((r) => r.ok).catch(() => false)
    if (ready) break
    await new Promise((r) => setTimeout(r, 500))
  }
  // The test reads the secret from the environment so it can sign messages the way the backend does.
  code = await run(['playwright', 'test', '-c', 'playwright.api.config.ts'])
} finally {
  if (site?.pid) process.kill(-site.pid)
  mock.close()
  writeFileSync('tsconfig.json', tsconfig)
}
process.exit(code)
