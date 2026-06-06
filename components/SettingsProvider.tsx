'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, type Settings } from '@/lib/supabase'

const SettingsContext = createContext<Settings | null>(null)

export function useSettings() {
  return useContext(SettingsContext)
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
          if (data.brand_color) {
            document.documentElement.style.setProperty('--brand-color', data.brand_color)
          }
        }
      })
  }, [])

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  )
}
