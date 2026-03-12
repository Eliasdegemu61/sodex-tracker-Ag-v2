import { cacheManager } from '@/lib/cache-manager'

export interface PairVolume {
  pair: string
  volume: number
  type: 'spot' | 'futures'
}

export interface VolumeApiResponse {
  updated_at: string
  all_time_stats: {
    total_combined_volume: number
    total_spot_volume: number
    total_futures_volume: number
    top_5_spot: Array<{ pair: string; volume: number }>
    top_5_futures: Array<{ pair: string; volume: number }>
  }
  today_stats: {
    date: string
    top_5_spot: Array<{ pair: string; volume: number }>
    top_5_futures: Array<{ pair: string; volume: number }>
  }
}

export interface DayVolume {
  day_date: string
  timestamp: number
  pairs: PairVolume[]
  total: number
  cumulative: number
}

export interface CachedVolumeData {
  lastUpdated: number
  data: DayVolume[]
  topPairsAllTime: PairVolume[]
  todayData: DayVolume | null
  apiData?: VolumeApiResponse
}

const VOLUME_CACHE_KEY = 'trading_volume_data'
const API_URL = 'https://raw.githubusercontent.com/Eliasdegemu61/sodex-tracker-new-v1-data-2/main/volume_summary.json'
const CHART_API_URL = 'https://raw.githubusercontent.com/Eliasdegemu61/sodex-tracker-new-v1-data-2/main/volume_chart.json'
const CHART_CACHE_KEY = 'chart_data'

export interface ChartDataPoint {
  day: string
  spot_vol: number
  futures_vol: number
  total_day_vol: number
}


function getTodayDate(): string {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

// Fetch real data from our server API (pulls from Supabase)
async function fetchVolumeFromApi(): Promise<VolumeApiResponse | null> {
  try {
    const response = await fetch('/api/volume/summary');
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('[SUPABASE] Failed to fetch volume data from server API, falling back to mock data');
    return null;
  }
}

// Convert API response to our internal format
function convertApiToCache(apiData: VolumeApiResponse): CachedVolumeData {
  const allTimeStats = apiData.all_time_stats
  const todayStats = apiData.today_stats

  // Create top pairs array from API
  const topPairsAllTime: PairVolume[] = [
    ...allTimeStats.top_5_spot.map(p => ({ ...p, type: 'spot' as const })),
    ...allTimeStats.top_5_futures.map(p => ({ ...p, type: 'futures' as const })),
  ].sort((a, b) => b.volume - a.volume)

  // Create today's data
  const todayPairs: PairVolume[] = [
    ...todayStats.top_5_spot.map(p => ({ ...p, type: 'spot' as const })),
    ...todayStats.top_5_futures.map(p => ({ ...p, type: 'futures' as const })),
  ]

  const todayTotal = todayPairs.reduce((sum, p) => sum + p.volume, 0)

  const todayData: DayVolume = {
    day_date: todayStats.date,
    timestamp: new Date(todayStats.date).getTime(),
    pairs: todayPairs,
    total: todayTotal,
    cumulative: todayTotal,
  }

  return {
    lastUpdated: Date.now(),
    data: [todayData],
    topPairsAllTime,
    todayData,
    apiData,
  }
}

// Mock data fallback
function generateMockVolumeData(): CachedVolumeData {
  const mockPairs = ['BTC/USDC', 'ETH/USDC', 'SOL/USDC', 'BTC-USD', 'ETH-USD', 'SOL-USD']

  const data: DayVolume[] = []
  let cumulative = 0

  for (let i = 89; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]

    const pairs: PairVolume[] = mockPairs.map((pair) => ({
      pair,
      volume: Math.random() * 50000 + 5000,
      type: pair.includes('/') ? 'spot' : 'futures',
    }))

    const dayTotal = pairs.reduce((sum, p) => sum + p.volume, 0)
    cumulative += dayTotal

    data.push({
      day_date: dateStr,
      timestamp: date.getTime(),
      pairs,
      total: dayTotal,
      cumulative,
    })
  }

  const topPairsAllTime: PairVolume[] = mockPairs.map((pair) => ({
    pair,
    volume: Math.random() * 5000000 + 500000,
    type: (pair.includes('/') ? 'spot' : 'futures') as 'spot' | 'futures',
  })).sort((a, b) => b.volume - a.volume)

  const todayDate = getTodayDate()
  const todayData = data.find(d => d.day_date === todayDate) || null

  return {
    lastUpdated: Date.now(),
    data,
    topPairsAllTime,
    todayData,
  }
}

export async function fetchAndCacheVolumeData() {
  return cacheManager.deduplicate(VOLUME_CACHE_KEY, async () => {
    const apiData = await fetchVolumeFromApi()
    if (apiData) {
      return convertApiToCache(apiData)
    }
    return generateMockVolumeData()
  })
}



export function getTopPairsByType(
  data: CachedVolumeData,
  type: 'spot' | 'futures' | 'all',
  limit: number = 10
): PairVolume[] {
  let pairs = data.topPairsAllTime

  if (type !== 'all') {
    pairs = pairs.filter((p) => p.type === type)
  }

  return pairs.slice(0, limit)
}

export function getLastDayStats(data: CachedVolumeData) {
  if (!data.data || data.data.length === 0) {
    return {
      spotPairs: 0,
      futuresPairs: 0,
      spotVolume: 0,
      futuresVolume: 0,
      totalVolume: 0,
      dayDate: '',
    }
  }

  // Get the last day (most recent)
  const lastDay = data.data[data.data.length - 1]
  const spotPairs = lastDay.pairs.filter((p) => p.type === 'spot')
  const futuresPairs = lastDay.pairs.filter((p) => p.type === 'futures')

  return {
    spotPairs: spotPairs.length,
    futuresPairs: futuresPairs.length,
    spotVolume: spotPairs.reduce((sum, p) => sum + p.volume, 0),
    futuresVolume: futuresPairs.reduce((sum, p) => sum + p.volume, 0),
    totalVolume: lastDay.total,
    dayDate: lastDay.day_date,
  }
}

export function getAllTimeStats(data: CachedVolumeData) {
  const spotPairsMap: { [key: string]: number } = {}
  const futuresPairsMap: { [key: string]: number } = {}

  // Iterate through all daily data to count unique pairs and total volumes
  data.data.forEach((day) => {
    day.pairs.forEach((pair) => {
      if (pair.type === 'spot') {
        spotPairsMap[pair.pair] = (spotPairsMap[pair.pair] || 0) + pair.volume
      } else {
        futuresPairsMap[pair.pair] = (futuresPairsMap[pair.pair] || 0) + pair.volume
      }
    })
  })

  const totalSpotVolume = Object.values(spotPairsMap).reduce((sum, vol) => sum + vol, 0)
  const totalFuturesVolume = Object.values(futuresPairsMap).reduce((sum, vol) => sum + vol, 0)

  return {
    totalSpotPairs: Object.keys(spotPairsMap).length,
    totalFuturesPairs: Object.keys(futuresPairsMap).length,
    totalSpotVolume,
    totalFuturesVolume,
  }
}

function getEmptyCache(): CachedVolumeData {
  return {
    lastUpdated: 0,
    data: [],
    topPairsAllTime: [],
    todayData: null,
  }
}

export function getTotalAllTimeVolume(data: CachedVolumeData): number {
  const allTimeStats = getAllTimeStats(data)
  return allTimeStats.totalSpotVolume + allTimeStats.totalFuturesVolume
}

export function getSpotAndFuturesVolumes(data: CachedVolumeData): { spot: number; futures: number } {
  const allTimeStats = getAllTimeStats(data)
  return {
    spot: allTimeStats.totalSpotVolume,
    futures: allTimeStats.totalFuturesVolume,
  }
}

// Direct API data accessors for component use
export function getTotalVolumeFromApi(data: CachedVolumeData): {
  total: number
  spot: number
  futures: number
} {
  if (!data.apiData) {
    const stats = getAllTimeStats(data)
    return {
      total: stats.totalSpotVolume + stats.totalFuturesVolume,
      spot: stats.totalSpotVolume,
      futures: stats.totalFuturesVolume,
    }
  }

  return {
    total: data.apiData.all_time_stats.total_combined_volume,
    spot: data.apiData.all_time_stats.total_spot_volume,
    futures: data.apiData.all_time_stats.total_futures_volume,
  }
}

export function getAllTimeTopPairs(data: CachedVolumeData): {
  spot: Array<{ pair: string; volume: number }>
  futures: Array<{ pair: string; volume: number }>
} {
  if (!data.apiData) {
    return {
      spot: data.topPairsAllTime.filter(p => p.type === 'spot').slice(0, 5),
      futures: data.topPairsAllTime.filter(p => p.type === 'futures').slice(0, 5),
    }
  }

  return {
    spot: data.apiData.all_time_stats.top_5_spot,
    futures: data.apiData.all_time_stats.top_5_futures,
  }
}

export function getTodayTopPairs(data: CachedVolumeData): {
  spot: Array<{ pair: string; volume: number }>
  futures: Array<{ pair: string; volume: number }>
} {
  if (!data.apiData) {
    if (!data.todayData) {
      return { spot: [], futures: [] }
    }

    return {
      spot: data.todayData.pairs.filter(p => p.type === 'spot').slice(0, 5),
      futures: data.todayData.pairs.filter(p => p.type === 'futures').slice(0, 5),
    }
  }

  return {
    spot: data.apiData.today_stats.top_5_spot,
    futures: data.apiData.today_stats.top_5_futures,
  }
}

export async function fetchChartData(): Promise<ChartDataPoint[]> {
  return cacheManager.deduplicate(CHART_CACHE_KEY, async () => {
    try {
      const response = await fetch('/api/volume/chart');
      if (!response.ok) throw new Error(`Chart API error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('[v0] Failed to fetch chart data from API, using mock data');
      return generateMockChartData();
    }
  });
}

function generateMockChartData(): ChartDataPoint[] {
  const data: ChartDataPoint[] = []
  const now = new Date()

  for (let i = 89; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]

    const spotVol = Math.random() * 5000 + 500
    const futuresVol = Math.random() * 8000 + 1000

    data.push({
      day: dateStr,
      spot_vol: Number(spotVol.toFixed(2)),
      futures_vol: Number(futuresVol.toFixed(2)),
      total_day_vol: Number((spotVol + futuresVol).toFixed(2)),
    })
  }

  return data
}

