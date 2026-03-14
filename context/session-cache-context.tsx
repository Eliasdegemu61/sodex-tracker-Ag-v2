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
      // spot_leaderboard.csv fetching removed as per user request
      
      const cachedData: LeaderboardData = {
        spotData: [],
        lastFetched: Date.now(),
      }

      setLeaderboardCache(cachedData)
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
