import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

interface LeaderboardEntry {
  userId: string
  address: string
  pnl: string
  vol: string
}


interface CacheData {
  // DEX Status Data
  dexStatus: {
    totalUsers: number
    usersInProfit: number
    usersInLoss: number
    totalVolume: number
    spotVolume: number
    perpVolume: number
    spotVsPerpsRatio: { spot: number; perps: number }
    topGainers: Array<{ userId: string; address: string; pnl: number; vol: number }>
    topLosers: Array<{ userId: string; address: string; pnl: number; vol: number }>
    pnlByVolumeRange: Array<{ range: string; avgPnl: number; count: number }>
    overallProfitEfficiency: { profitUsers: number; avgProfit: number; avgLoss: number }
    todayTopPairs: Array<{ pair: string; volume: number }>
    allTimeTopPairs: Array<{ pair: string; volume: number }>
    topTradersSpot: Array<{ address: string; volume: number; rank: number }>
    topTradersPrerps: Array<{ address: string; volume: number; rank: number }>
  }
  // Leaderboard Data
  leaderboards: {
    perpsLeaderboard: LeaderboardEntry[]
  }
  lastUpdated: number
}

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const CACHE_DURATION = 30 * 60 // 30 minutes in seconds
const CACHE_KEY = 'comprehensive-dex-cache'

const GITHUB_URLS = {
  traders: 'https://raw.githubusercontent.com/Eliasdegemu61/Sodex-Tracker-new-v1/main/live_stats.json',
  volume: 'https://raw.githubusercontent.com/Eliasdegemu61/sodex-tracker-new-v1-data-2/main/volume_summary.json',
}

async function calculateComprehensiveData(): Promise<CacheData> {
  console.log('[v0] Server: Calculating comprehensive DEX and Leaderboard data')

  try {
    // Fetch only volume data as traders data (live_stats.json) is removed
    const volumeRes = await fetch(GITHUB_URLS.volume, { cache: 'no-store' })

    if (!volumeRes.ok) {
      throw new Error('Failed to fetch volume data from GitHub')
    }

    const volumeData = await volumeRes.json()

    // --- DEX STATUS CALCULATIONS ---
    // Trader stats removed as per user request to stop using live_stats.json

    const totalUsers = 0
    const usersInProfit = 0
    const usersInLoss = 0

    // Volume calculations
    const totalVolume = 0 // Adjust if needed
    const spotVolume = volumeData.all_time_stats.total_spot_volume || 0
    const perpVolume = volumeData.all_time_stats.total_futures_volume || 0
    const spotVsPerpsRatio = {
      spot: spotVolume / (spotVolume + perpVolume),
      perps: perpVolume / (spotVolume + perpVolume),
    }

    // Empty stats for traders
    const topGainers: any[] = []
    const topLosers: any[] = []
    const pnlByVolumeRange: any[] = []
    const overallProfitEfficiency = {
      profitUsers: 0,
      avgProfit: 0,
      avgLoss: 0,
    }

    // Top Pairs
    const todayTopPairs = volumeData.today_stats?.top_5_spot?.map((p: any) => ({
      pair: p.pair,
      volume: p.volume,
    })) || []

    const allTimeTopPairs = volumeData.all_time_stats?.top_5_spot?.map((p: any) => ({
      pair: p.pair,
      volume: p.volume,
    })) || []

    // Top Traders (Empty as they rely on traders data)
    const topTradersSpot: any[] = []
    const topTradersPrerps: any[] = []

    // --- LEADERBOARD CALCULATIONS ---
    // Perps Leaderboard empty
    const perpsLeaderboard: any[] = []


    // Compile all data
    const cacheData: CacheData = {
      dexStatus: {
        totalUsers,
        usersInProfit,
        usersInLoss,
        totalVolume,
        spotVolume,
        perpVolume,
        spotVsPerpsRatio,
        topGainers,
        topLosers,
        pnlByVolumeRange,
        overallProfitEfficiency,
        todayTopPairs,
        allTimeTopPairs,
        topTradersSpot,
        topTradersPrerps,
      },
      leaderboards: {
        perpsLeaderboard,
      },
      lastUpdated: Date.now(),
    }

    // Store in Redis with 30 minute expiration
    await redis.setex(CACHE_KEY, CACHE_DURATION, JSON.stringify(cacheData))
    console.log('[v0] Server: Comprehensive cache stored in Redis for', CACHE_DURATION, 'seconds')

    return cacheData
  } catch (error) {
    console.error('[v0] Server: Error calculating comprehensive data:', error)
    throw error
  }
}

export async function GET(request: NextRequest) {
  try {
    // Try to get from Redis cache
    const cached = await redis.get<string>(CACHE_KEY)

    if (cached) {
      const cacheData: CacheData = JSON.parse(cached)
      const cacheAgeSeconds = Math.round((Date.now() - cacheData.lastUpdated) / 1000)
      console.log('[v0] Server: Returning cached data from Redis (age:', cacheAgeSeconds, 'seconds)')

      return NextResponse.json({
        ...cacheData,
        fromCache: true,
        cacheAgeSeconds,
      })
    }

    // Cache miss, calculate fresh data
    console.log('[v0] Server: Cache miss, calculating fresh data')
    const freshData = await calculateComprehensiveData()

    return NextResponse.json({
      ...freshData,
      fromCache: false,
      cacheAgeSeconds: 0,
    })
  } catch (error) {
    console.error('[v0] Server: Error in comprehensive cache API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comprehensive cache data' },
      { status: 500 }
    )
  }
}

// POST to manually refresh cache
export async function POST(request: NextRequest) {
  try {
    console.log('[v0] Server: Manually refreshing comprehensive cache')
    const data = await calculateComprehensiveData()
    return NextResponse.json({
      message: 'Comprehensive cache refreshed',
      ...data,
      fromCache: false,
    })
  } catch (error) {
    console.error('[v0] Server: Error refreshing cache:', error)
    return NextResponse.json(
      { error: 'Failed to refresh cache' },
      { status: 500 }
    )
  }
}
