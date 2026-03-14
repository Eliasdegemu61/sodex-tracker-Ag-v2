import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getCache, setCacheWithTTL, CACHE_KEYS, setCacheRefreshTime } from '@/lib/redis-service'

const GITHUB_TRADERS_URL = 'https://raw.githubusercontent.com/Eliasdegemu61/Sodex-Tracker-new-v1/main/live_stats.json'

interface TraderData {
  userId: string
  address: string
  pnl: string
  vol: string
}

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

/**
 * Calculate average PnL by volume range
 */
function calculateAvgPnlByVolumeRange(traders: TraderData[]): Record<string, number> {
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

async function fetchAndCalculateDexStats(): Promise<DexStatusResponse> {
  try {
    const response = await fetch(GITHUB_TRADERS_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Failed to fetch traders: ${response.status}`);
    const traders: TraderData[] = await response.json();

    const totalUsers = traders.length
    const usersInProfit = traders.filter((t) => parseFloat(t.pnl) > 0).length
    const usersInLoss = traders.filter((t) => parseFloat(t.pnl) < 0).length

    // Sort by PnL for top traders and losers
    const sortedByPnL = [...traders].sort((a, b) => parseFloat(b.pnl) - parseFloat(a.pnl))
    const topTradersPerps = sortedByPnL.slice(0, 10).map((t, idx) => ({
      rank: idx + 1,
      userId: t.userId,
      address: t.address,
      pnl: parseFloat(t.pnl),
      vol: parseFloat(t.vol),
    }))

    const topLoserPerps = sortedByPnL.slice(-5).reverse().map((t, idx) => ({
      rank: idx + 1,
      userId: t.userId,
      address: t.address,
      pnl: parseFloat(t.pnl),
      vol: parseFloat(t.vol),
    }))

    const topGainers = sortedByPnL
      .filter((t) => parseFloat(t.pnl) > 0)
      .slice(0, 5)
      .map((t, idx) => ({
        rank: idx + 1,
        userId: t.userId,
        address: t.address,
        pnl: parseFloat(t.pnl),
        vol: parseFloat(t.vol),
      }))

    // For spot traders, we would fetch spot data if available
    // For now, using empty array - update when spot data source is available
    const topTradersSpot: Array<{ rank: number; address: string; vol: number }> = []

    const avgPnlByVolumeRange = calculateAvgPnlByVolumeRange(traders)

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

    // Cache all individual values
    await Promise.all([
      setCacheWithTTL(CACHE_KEYS.DEX_TOTAL_USERS, totalUsers),
      setCacheWithTTL(CACHE_KEYS.DEX_AVG_PNL_BY_VOLUME, avgPnlByVolumeRange),
      setCacheWithTTL(CACHE_KEYS.DEX_TOP_TRADERS_PERPS, topTradersPerps),
      setCacheWithTTL(CACHE_KEYS.DEX_TOP_LOSERS, topLoserPerps),
      setCacheWithTTL(CACHE_KEYS.DEX_TOP_GAINERS, topGainers),
      setCacheWithTTL(CACHE_KEYS.DEX_TOP_TRADERS_SPOT, topTradersSpot),
      setCacheRefreshTime(),
    ])

    console.log('[v0] DEX Status data cached successfully')
    return result
  } catch (error) {
    console.error('[v0] Error fetching DEX data:', error)
    throw error
  }
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
