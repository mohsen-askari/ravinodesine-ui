// Carries the reader's place across a language switch. The locale segment sits above the
// experience, so switching language remounts it; this lets the new mount restore the same
// project, vertical position and horizontal position instead of resetting to the top.
const KEY = 'ravino:view-state'
const MAX_AGE_MS = 15_000

export interface ViewState {
  slug: string | null
  scrollY: number
  /** Horizontal position of the open strip as 0..1 (direction-agnostic). */
  strip: number
  at: number
}

type Provider = () => Omit<ViewState, 'at'>
let provider: Provider | null = null

export function registerViewStateProvider(fn: Provider | null) {
  provider = fn
}

export function captureViewState() {
  if (typeof window === 'undefined' || !provider) return
  try {
    const state: ViewState = { ...provider(), at: Date.now() }
    window.sessionStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* storage unavailable (private mode) — restoring is best-effort */
  }
}

// Remembered for a moment after consumption: React StrictMode (dev) mounts every component
// twice, and the second mount must still see the state the first one consumed.
let consumed: ViewState | null = null

export function consumeViewState(slug: string | null): ViewState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(KEY)
    if (raw) {
      window.sessionStorage.removeItem(KEY)
      consumed = JSON.parse(raw) as ViewState
      window.setTimeout(() => (consumed = null), 2000)
    }
    const state = consumed
    if (!state || Date.now() - state.at > MAX_AGE_MS) return null
    return state.slug === slug ? state : null
  } catch {
    return null
  }
}
