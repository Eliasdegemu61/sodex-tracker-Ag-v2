'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'

export interface LeaderboardData {
  spotData: any[]
  lastFetched: number
}

interface SessionCacheContextType {
  leaderboardCache: LeaderboardData | null
  setLeaderboardCache: (data: LeaderboardData) => void
  isPreloadingLeaderboard: boolean
  setIsPreloadingLeaderboard: (value: boolean) => void
  preloadLeaderboardData: () => Promise<void>
}

const SessionCacheContext = createContext<SessionCacheContextType | undefined>(undefined)

const parseCSV = (csvText: string): any[] => {
  const lines = csvText.trim().split('\n')
  const entries: any[] = []

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const parts = line.split(',')
    if (parts.length >= 4) {
      try {
        entries.push({
          rank: parseInt(parts[0]),
          userId: parts[1],
          address: parts[2].trim(),
          vol: parseFloat(parts[3]),
          pnl: parts[4] ? parseFloat(parts[4]) : undefined,
        })
      } catch (e) {
        console.error('[v0] Error parsing CSV line:', line)
      }
    }
  }

  return entries
}

export function SessionCacheProvider({ children }: { children: ReactNode }) {
  const [leaderboardCache, setLeaderboardCache] = useState<LeaderboardData | null>(null)
  const [isPreloadingLeaderboard, setIsPreloadingLeaderboard] = useState(false)

  const preloadLeaderboardData = useCallback(async () => {
    // If cache exists and is still valid (in same session), don't refetch
    if (leaderboardCache) {
      console.log('[v0] Leaderboard data already cached, skipping preload')
      return
    }

    setIsPreloadingLeaderboard(true)
    try {
      console.log('[v0] Preloading leaderboard data in background...')

      // Fetch spot leaderboard data
      const spotResponse = await fetch('https://raw.githubusercontent.com/Eliasdegemu61/sodex-finalised-raw-data/refs/heads/main/spot_leaderboard.csv')
      const spotText = await spotResponse.text()

      const spotData = parseCSV(spotText)

      const cachedData: LeaderboardData = {
        spotData,
        lastFetched: Date.now(),
      }

      setLeaderboardCache(cachedData)
      console.log('[v0] Leaderboard data preloaded successfully:', {
        spotCount: spotData.length,
      })
    } catch (error) {
      console.error('[v0] Error preloading leaderboard data:', error)
    } finally {
      setIsPreloadingLeaderboard(false)
    }
  }, [leaderboardCache])

  // Automatically trigger preload on mount
  useEffect(() => {
    preloadLeaderboardData()
  }, [])

  return (
    <SessionCacheContext.Provider
      value={{
        leaderboardCache,
        setLeaderboardCache,
        isPreloadingLeaderboard,
        setIsPreloadingLeaderboard,
        preloadLeaderboardData,
      }}
    >
      {children}
    </SessionCacheContext.Provider>
  )
}

export function useSessionCache() {
  const context = useContext(SessionCacheContext)
  if (context === undefined) {
    throw new Error('useSessionCache must be used within a SessionCacheProvider')
  }
  return context
}
