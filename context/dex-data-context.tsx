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

const GITHUB_TRADERS_URL = 'https://raw.githubusercontent.com/Eliasdegemu61/Sodex-Tracker-new-v1/main/live_stats.json'

function calculateAvgPnlByVolumeRange(traders: any[]): Record<string, number> {
  const ranges = {
    '0-10k': { min: 0, max: 10000, trades: [] as number[] },
    '10k-50k': { min: 10000, max: 50000, trades: [] as number[] },
    '50k-100k': { min: 50000, max: 100000, trades: [] as number[] },
    '100k-500k': { min: 100000, max: 500000, trades: [] as number[] },
    '500k+': { min: 500000, max: Infinity, trades: [] as number[] },
  }

  traders.forEach((trader) => {
    const vol = parseFloat(trader.vol)
    const pnl = parseFloat(trader.pnl)

    for (const [key, range] of Object.entries(ranges)) {
      if (vol >= range.min && vol < range.max) {
        range.trades.push(pnl)
        break
      }
    }
  })

  const result: Record<string, number> = {}
  for (const [key, range] of Object.entries(ranges)) {
    if (range.trades.length > 0) {
      const avg = range.trades.reduce((a, b) => a + b, 0) / range.trades.length
      result[key] = Math.round(avg * 100) / 100
    } else {
      result[key] = 0
    }
  }

  return result
}

export function DexDataProvider({ children }: { children: ReactNode }) {
  const [overallStats, setOverallStats] = useState<OverallStatsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(GITHUB_TRADERS_URL, { cache: 'no-store' })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const raw: any[] = await response.json()
        
        const totalUsers = raw.length
        const usersInProfit = raw.filter((t) => parseFloat(t.pnl) > 0).length
        const usersInLoss = raw.filter((t) => parseFloat(t.pnl) < 0).length
        const avgPnlByVolumeRange = calculateAvgPnlByVolumeRange(raw)

        const sortedByPnL = [...raw].sort((a, b) => parseFloat(b.pnl) - parseFloat(a.pnl))
        
        const mappedData: OverallStatsData = {
          summary: {
            total_users: totalUsers,
            active_users: totalUsers,
            profitable_percent: totalUsers > 0 ? (usersInProfit / totalUsers) * 100 : 0,
            loss_percent: totalUsers > 0 ? (usersInLoss / totalUsers) * 100 : 0,
          },
          chart_data: Object.entries(avgPnlByVolumeRange).map(([range, avg]) => ({
            range,
            avg_pnl: avg as number
          })),
          top_5_gainers: sortedByPnL.slice(0, 5).map((t, idx) => ({
            rank: idx + 1,
            userId: t.userId,
            address: t.address,
            pnl: parseFloat(t.pnl),
            vol: parseFloat(t.vol),
          })),
          top_5_losers: sortedByPnL.slice(-5).reverse().map((t, idx) => ({
            rank: idx + 1,
            userId: t.userId,
            address: t.address,
            pnl: parseFloat(t.pnl),
            vol: parseFloat(t.vol),
          })),
          top_5_futures_vol: [...raw].sort((a, b) => parseFloat(b.vol) - parseFloat(a.vol)).slice(0, 5).map((t, idx) => ({
            rank: idx + 1,
            userId: t.userId,
            address: t.address,
            pnl: parseFloat(t.pnl),
            vol: parseFloat(t.vol),
          })),
          top_5_spot_vol: [] // Update if spot data becomes available
        }

        console.log('[GITHUB] DEX Data loaded directly from GitHub Client-Side')
        setOverallStats(mappedData)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        console.error('[GITHUB] Error fetching DEX stats:', errorMessage)
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
