'use client'

import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import type { Direction, Locale } from './config'
import type { Dictionary } from './dictionary'

interface I18nValue {
  locale: Locale
  dir: Direction
  dict: Dictionary
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ locale, dir, dict, children }: I18nValue & { children: ReactNode }) {
  const value = useMemo(() => ({ locale, dir, dict }), [locale, dir, dict])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside <I18nProvider>')
  return value
}
