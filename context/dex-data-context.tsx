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
  const [overallStats, setOverallStats] = useState<OverallStatsData | null>({
    summary: {
      total_users: 0,
      active_users: 0,
      profitable_percent: 0,
      loss_percent: 0
    },
    chart_data: [],
    top_5_gainers: [],
    top_5_losers: [],
    top_5_futures_vol: [],
    top_5_spot_vol: []
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
