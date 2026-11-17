'use client'

import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { CategoryKey } from '@/content/types'

export type CategoryFilter = CategoryKey | 'all'

interface UiState {
  filter: CategoryFilter
  setFilter: (f: CategoryFilter) => void
  menuOpen: boolean
  setMenuOpen: (open: boolean) => void
}

const UiContext = createContext<UiState | null>(null)

export function UiProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<CategoryFilter>('all')
  const [menuOpen, setMenuOpen] = useState(false)
  const value = useMemo(() => ({ filter, setFilter, menuOpen, setMenuOpen }), [filter, menuOpen])
  return <UiContext.Provider value={value}>{children}</UiContext.Provider>
}

export function useUi(): UiState {
  const v = useContext(UiContext)
  if (!v) throw new Error('useUi must be used inside <UiProvider>')
  return v
}
