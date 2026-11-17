import { defineConfig, devices } from '@playwright/test'

// Tests run against the production build: that is what ships, and it avoids dev-mode
// overhead skewing the animation-continuity measurements.
const PORT = Number(process.env.E2E_PORT ?? 3101)

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  workers: 2,
  // CI only: at most two retries, and the first failed attempt stays visible (the list/github reporters name every
  // test that needed a retry as "flaky", and its trace is kept). Locally there are no retries.
  retries: process.env.CI ? 2 : 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['list'], ['github']] : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    launchOptions: { args: ['--no-proxy-server'] },
  },
  projects: [
    { name: 'desktop', testIgnore: /mobile\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    {
      name: 'mobile',
      testMatch: /mobile\.spec\.ts/,
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/en/projects`,
    reuseExistingServer: true,
    timeout: 60_000,
    env: { NO_PROXY: 'localhost,127.0.0.1', no_proxy: 'localhost,127.0.0.1' },
  },
})
