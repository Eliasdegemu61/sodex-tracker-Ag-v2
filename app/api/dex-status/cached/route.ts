import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getCache, setCacheWithTTL, CACHE_KEYS, setCacheRefreshTime } from '@/lib/redis-service'


interface DexStatusResponse {
  totalUsers: number
  usersInProfit: number
  usersInLoss: number
  topTradersPerps: Array<{ rank: number; userId: string; address: string; pnl: number; vol: number }>
  topLoserPerps: Array<{ rank: number; userId: string; address: string; pnl: number; vol: number }>
  topGainers: Array<{ rank: number; userId: string; address: string; pnl: number; vol: number }>
  topTradersSpot: Array<{ rank: number; address: string; vol: number }>
  avgPnlByVolumeRange: Record<string, number>
  fromCache: boolean
}

async function fetchAndCalculateDexStats(): Promise<DexStatusResponse> {
  // Traders data (live_stats.json) removed as per user request
  const totalUsers = 0
  const usersInProfit = 0
  const usersInLoss = 0
  const topTradersPerps: any[] = []
  const topLoserPerps: any[] = []
  const topGainers: any[] = []
  const topTradersSpot: any[] = []
  const avgPnlByVolumeRange: Record<string, number> = {}

  const result: DexStatusResponse = {
    totalUsers,
    usersInProfit,
    usersInLoss,
    topTradersPerps,
    topLoserPerps,
    topGainers,
    topTradersSpot,
    avgPnlByVolumeRange,
    fromCache: false,
  }

  // Cache individual values with defaults
  await Promise.all([
    setCacheWithTTL(CACHE_KEYS.DEX_TOTAL_USERS, totalUsers),
    setCacheWithTTL(CACHE_KEYS.DEX_AVG_PNL_BY_VOLUME, avgPnlByVolumeRange),
    setCacheWithTTL(CACHE_KEYS.DEX_TOP_TRADERS_PERPS, topTradersPerps),
    setCacheWithTTL(CACHE_KEYS.DEX_TOP_LOSERS, topLoserPerps),
    setCacheWithTTL(CACHE_KEYS.DEX_TOP_GAINERS, topGainers),
    setCacheWithTTL(CACHE_KEYS.DEX_TOP_TRADERS_SPOT, topTradersSpot),
    setCacheRefreshTime(),
  ])

  return result
}

export async function GET(request: NextRequest) {
  try {
    // Try to get from cache first
    console.log('[v0] Checking DEX Status cache')
    const [totalUsers, avgPnl, topPerps, topLosers, topGainers, topSpot] = await Promise.all([
      getCache<number>(CACHE_KEYS.DEX_TOTAL_USERS),
      getCache<Record<string, number>>(CACHE_KEYS.DEX_AVG_PNL_BY_VOLUME),
      getCache<any>(CACHE_KEYS.DEX_TOP_TRADERS_PERPS),
      getCache<any>(CACHE_KEYS.DEX_TOP_LOSERS),
      getCache<any>(CACHE_KEYS.DEX_TOP_GAINERS),
      getCache<any>(CACHE_KEYS.DEX_TOP_TRADERS_SPOT),
    ])

    if (
      totalUsers !== null &&
      avgPnl !== null &&
      topPerps !== null &&
      topLosers !== null &&
      topGainers !== null &&
      topSpot !== null
    ) {
      console.log('[v0] Returning DEX Status from cache')
      return NextResponse.json({
        totalUsers,
        usersInProfit: 0, // These are calculated, not cached separately
        usersInLoss: 0,
        topTradersPerps: topPerps,
        topLoserPerps: topLosers,
        topGainers,
        topTradersSpot: topSpot,
        avgPnlByVolumeRange: avgPnl,
        fromCache: true,
      } as DexStatusResponse)
    }

    // Cache miss, fetch fresh data
    console.log('[v0] DEX Status cache miss, fetching fresh data')
    const freshData = await fetchAndCalculateDexStats()

    return NextResponse.json(freshData)
  } catch (error) {
    console.error('[v0] Error in DEX Status API:', error)
    return NextResponse.json({ error: 'Failed to fetch DEX Status data' }, { status: 500 })
  }
}
