import { readdirSync } from 'node:fs'
import { expect, test } from '@playwright/test'

// Made-up project addresses must answer 404 without leaving a cached copy of the 404 page behind for each of them.
test('unknown project addresses answer 404 and do not grow the page cache', async ({ request }) => {
  const dir = `${process.env.NEXT_DIST_DIR ?? '.next'}/server/app/en/projects`
  const before = readdirSync(dir).length

  for (let i = 0; i < 40; i++) {
    for (const path of [`/en/projects/probe-${i}`, `/fa/projects/probe-${i}`, `/en/projects/zagros-lodge/probe-${i}`]) {
      expect((await request.get(path)).status(), path).toBe(404)
    }
  }

  expect(readdirSync(dir).length).toBe(before)
  expect((await request.get('/en/projects/zagros-lodge')).status()).toBe(200)
  expect((await request.get('/en/projects')).status()).toBe(200)
})
