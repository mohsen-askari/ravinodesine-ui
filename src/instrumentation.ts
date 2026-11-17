import { configurationProblems } from '@/lib/config-check'

// Runs once when the server starts. Only names the setting, never prints its value.
export function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  for (const problem of configurationProblems()) console.error(`[config] ${problem}`)
}
