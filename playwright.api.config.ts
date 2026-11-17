import { defineConfig } from '@playwright/test'

// Webhook / API-mode checks. Run through `npm run test:e2e:api`, which starts the mock API, builds into .next-api and
// starts the server (scripts/e2e-api.mjs); the ports below must match that script.
export default defineConfig({
  testDir: './tests/e2e-api',
  timeout: 60_000,
  expect: { timeout: 8_000 },
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['list'], ['github']] : [['list']],
  use: { baseURL: `http://127.0.0.1:${process.env.E2E_API_PORT ?? 3104}` },
})
