'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface OverallStatsData {
  summary: {
    total_users: number
    active_users: number
    profitable_percent: number
    loss_percent: number
  }
  chart_data: Array<{
    range: string
    avg_pnl: number
  }>
  top_5_gainers: Array<{
    userId: string
    address: string
    pnl: number
    vol: number
    rank: number
  }>
  top_5_losers: Array<{
    userId: string
    address: string
    pnl: number
    vol: number
    rank: number
  }>
  top_5_futures_vol: Array<{
    userId: string
    address: string
    pnl: number
    vol: number
    rank: number
  }>
  top_5_spot_vol: Array<{
    userId: string
    address: string
    pnl: number
    vol: number
    rank: number
  }>
}

interface DexDataContextType {
  overallStats: OverallStatsData | null
  isLoading: boolean
  error: string | null
}

const DexDataContext = createContext<DexDataContextType | undefined>(undefined)

export function DexDataProvider({ children }: { children: ReactNode }) {
  const [overallStats, setOverallStats] = useState<OverallStatsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch('/api/dex-status/cached')

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const raw = await response.json()
        
        // Map internal API response to the interface expected by components
        const mappedData: OverallStatsData = {
          summary: {
            total_users: raw.totalUsers,
            active_users: raw.totalUsers, // Approximation
            profitable_percent: raw.totalUsers > 0 ? (raw.usersInProfit / raw.totalUsers) * 100 : 0,
            loss_percent: raw.totalUsers > 0 ? (raw.usersInLoss / raw.totalUsers) * 100 : 0,
          },
          chart_data: Object.entries(raw.avgPnlByVolumeRange || {}).map(([range, avg]) => ({
            range,
            avg_pnl: avg as number
          })),
          top_5_gainers: raw.topGainers || [],
          top_5_losers: raw.topLoserPerps || [],
          top_5_futures_vol: raw.topTradersPerps || [],
          top_5_spot_vol: raw.topTradersSpot || []
        }

        console.log('[SUPABASE] DEX Data loaded via Server API')
        setOverallStats(mappedData)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        console.error('[SUPABASE] Error fetching DEX stats:', errorMessage)
        setError(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <DexDataContext.Provider value={{ overallStats, isLoading, error }}>
      {children}
    </DexDataContext.Provider>
  )
}

export function useDexData() {
  const context = useContext(DexDataContext)
  if (context === undefined) {
    throw new Error('useDexData must be used within DexDataProvider')
  }
  return context
}
