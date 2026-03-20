'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface Pair {
  pair: string
  volume: number
}

interface VolumeData {
  updated_at: string
  all_time_stats: {
    total_combined_volume: number
    total_spot_volume: number
    total_futures_volume: number
    top_5_spot: Pair[]
    top_5_futures: Pair[]
  }
  today_stats: {
    date: string
    top_5_spot: Pair[]
    top_5_futures: Pair[]
  }
}

interface VolumeDataContextType {
  volumeData: VolumeData | null
  isLoading: boolean
  error: string | null
}

const VolumeDataContext = createContext<VolumeDataContextType | undefined>(undefined)

export function VolumeDataProvider({ children }: { children: ReactNode }) {
  const [volumeData, setVolumeData] = useState<VolumeData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch('/api/volume/summary')
        if (!response.ok) {
          throw new Error(`API error! status: ${response.status}`)
        }
        const fetchedData: VolumeData = await response.json()
        setVolumeData(fetchedData)
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMsg)
        console.error('[GITHUB] Error fetching volume data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <VolumeDataContext.Provider value={{ volumeData, isLoading, error }}>
      {children}
    </VolumeDataContext.Provider>
  )
}

export function useVolumeData() {
  const context = useContext(VolumeDataContext)
  if (context === undefined) {
    throw new Error('useVolumeData must be used within a VolumeDataProvider')
  }
  return context
}
