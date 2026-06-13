'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, type Settings } from '@/lib/supabase'
import { getTheme } from '@/lib/themes'

const SettingsContext = createContext<Settings | null>(null)

export function useSettings() {
  return useContext(SettingsContext)
}

function applyTheme(settings: Settings) {
  const theme = getTheme(settings.color_theme || 'traffic-light')
  const root = document.documentElement
  root.style.setProperty('--brand-color', theme.tiers[0])
  root.style.setProperty('--tier-1', theme.tiers[0])
  root.style.setProperty('--tier-2', theme.tiers[1])
  root.style.setProperty('--tier-3', theme.tiers[2])
  root.style.setProperty('--tier-4', theme.tiers[3])
  root.style.setProperty('--tier-5', theme.tiers[4])
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null)

  useEffect(() => {
    supabase
      .from('settings')
      .select('*')
      .single()
      .then(({ data }) => {
        if (data) {
          setSettings(data as Settings)
          applyTheme(data as Settings)
        }
      })
  }, [])

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  )
}
