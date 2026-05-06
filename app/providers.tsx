'use client'

import { ReactNode, useEffect, useState, createContext, useContext } from 'react'
import { DexStatusProvider } from '@/context/dex-status-context'
import { PortfolioProvider } from '@/context/portfolio-context'
import { SessionCacheProvider } from '@/context/session-cache-context'
import { DexDataProvider } from '@/context/dex-data-context'
import { VolumeDataProvider } from '@/context/volume-data-context'
import { ExportProvider } from '@/context/export-context'

interface ThemeContextType {
  theme: 'light' | 'dark'
  toggleTheme: () => void
  mounted: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

function ThemeProviderContent({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Initialize theme from localStorage or system preference
    const storedTheme = (localStorage.getItem('theme') as 'light' | 'dark') || 'dark'
    setTheme(storedTheme)
    
    // Apply theme to HTML element
    const html = document.documentElement
    if (storedTheme === 'dark') {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
    
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    
    const html = document.documentElement
    if (newTheme === 'dark') {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeProviderContent>{children}</ThemeProviderContent>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionCacheProvider>
      <DexStatusProvider>
        <DexDataProvider>
          <VolumeDataProvider>
            <PortfolioProvider>
              <ExportProvider>
                <ThemeProvider>{children}</ThemeProvider>
              </ExportProvider>
            </PortfolioProvider>
          </VolumeDataProvider>
        </DexDataProvider>
      </DexStatusProvider>
    </SessionCacheProvider>
  )
}
