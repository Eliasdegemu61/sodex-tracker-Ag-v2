// Cache busted: v3
'use client';

import React from "react"

import { Suspense, useState, lazy, useEffect } from 'react'
import { Search, Bell, ChevronDown, Lock, Unlock, MessageCircle, MoreVertical, Moon, Sun } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/app/providers'
import { useSessionCache } from '@/context/session-cache-context'
import { DashboardStats } from '@/components/dashboard-stats'
import { VolumeChart } from '@/components/volume-chart'
import { FundFlowChart } from '@/components/fund-flow-chart'
import { TopPairsWidget } from '@/components/top-pairs-widget'
import { TodayTopPairs } from '@/components/today-top-pairs'
import { OverallDepositsCard, NetRemainingCard } from '@/components/overall-token-flow'
import { LeaderboardPage } from '@/components/leaderboard-page'
import { ProfitEfficiencyCard } from '@/components/profit-efficiency-card'
import { OverallProfitEfficiencyCard } from '@/components/overall-profit-efficiency-card'
import { TVLCard } from '@/components/tvl-card'
import { VolumeRangeCard } from '@/components/volume-range-card'
import { AnnouncementsPanel } from '@/components/announcements-panel'
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts'
import { MobileNavMenu } from '@/components/mobile-nav-menu'
import { NewTradersTracker } from '@/components/new-traders-tracker'
import { AnnouncementSidePanel } from '@/components/announcement-side-panel'
import { PortfolioSection } from '@/components/portfolio-section'

import { TrackerSection } from '@/components/tracker-section'
import { Footer } from '@/components/footer'
import { SopointsAnalyzer } from '@/components/sopoints-analyzer'
import { AboutSodex } from '@/components/about-sodex'

function LoadingCard() {
  return <Card className="p-4 md:p-6 bg-card border border-border h-64 animate-pulse" />
}

function DistributionAnalyzerPage({ onBack }: { onBack: () => void }) {
  const { leaderboardCache, isPreloadingLeaderboard } = useSessionCache()
  const [activeTab, setActiveTab] = useState<'distribution' | 'reverse' | 'sopoints' | 'pnl'>('distribution')
  const [brackets, setBrackets] = useState([
    { id: '1', volMin: '', volMax: '', pnlMin: '', pnlMax: '' }
  ])
  const [reversePrefix, setReversePrefix] = useState('')
  const [reverseSuffix, setReverseSuffix] = useState('')
  const [searchAddress, setSearchAddress] = useState('')
  const [searchAddressResult, setSearchAddressResult] = useState<any>(null)
  const [distributionResults, setDistributionResults] = useState<any>(null)
  const [reverseResults, setReverseResults] = useState<any[]>([])
  const [isLoadingDistribution, setIsLoadingDistribution] = useState(false)
  const [isLoadingReverse, setIsLoadingReverse] = useState(false)
  const [isSearchingAddress, setIsSearchingAddress] = useState(false)
  const [allTraders, setAllTraders] = useState<any[]>([])

  const addBracket = () => {
    setBrackets([...brackets, { id: Date.now().toString(), volMin: '', volMax: '', pnlMin: '', pnlMax: '' }])
  }

  const updateBracket = (id: string, field: string, value: string) => {
    setBrackets(brackets.map(b => b.id === id ? { ...b, [field]: value } : b))
  }

  const removeBracket = (id: string) => {
    if (brackets.length > 1) setBrackets(brackets.filter(b => b.id !== id))
  }

  const handleApply = async () => {
    setIsLoadingDistribution(true)
    try {
      let traders: any[] = []

      // Use cached data if available
      if (leaderboardCache?.pnlData && leaderboardCache.pnlData.length > 0) {
        console.log('[v0] Using cached data for Distribution Analyzer')
        traders = leaderboardCache.pnlData
      } else {
        // Fallback fetch
        const response = await fetch('https://raw.githubusercontent.com/Eliasdegemu61/sodex-finalised-raw-data/refs/heads/main/pnl_leaderboard.csv')
        if (!response.ok) throw new Error('Failed to fetch data')
        const csvText = await response.text()

        // Parse CSV
        const lines = csvText.trim().split('\n')
        if (lines.length < 2) throw new Error('Empty CSV data')

        const headers = lines[0].split(',').map(h => h.trim())
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim())
          const obj: any = {}
          headers.forEach((header, index) => {
            obj[header] = values[index] || ''
          })
          traders.push({
            userId: obj.userId || obj.user_id || '',
            address: obj.address || '',
            pnl: obj.pnl || '0',
            vol: obj.vol || '0',
          })
        }
      }

      setAllTraders(traders)

      // Calculate stats FOR EACH BRACKET separately
      const bracketStats = brackets.map(bracket => {
        const filtered = traders.filter(trader => {
          const vol = typeof trader.vol === 'string' ? parseFloat(trader.vol) : trader.vol || 0
          const pnl = typeof trader.pnl === 'string' ? parseFloat(trader.pnl) : trader.pnl || 0

          const volMin = bracket.volMin ? parseFloat(bracket.volMin) : -Infinity
          const volMax = bracket.volMax ? parseFloat(bracket.volMax) : Infinity
          const pnlMin = bracket.pnlMin ? parseFloat(bracket.pnlMin) : -Infinity
          const pnlMax = bracket.pnlMax ? parseFloat(bracket.pnlMax) : Infinity

          return vol >= volMin && vol <= volMax && pnl >= pnlMin && pnl <= pnlMax
        })

        const totalVol = filtered.reduce((sum, t) => sum + (typeof t.vol === 'string' ? parseFloat(t.vol) : t.vol || 0), 0)
        const totalPnl = filtered.reduce((sum, t) => sum + (typeof t.pnl === 'string' ? parseFloat(t.pnl) : t.pnl || 0), 0)
        const profitCount = filtered.filter(t => (typeof t.pnl === 'string' ? parseFloat(t.pnl) : t.pnl || 0) > 0).length
        const lossCount = filtered.filter(t => (typeof t.pnl === 'string' ? parseFloat(t.pnl) : t.pnl || 0) < 0).length

        // Donut chart data
        const donutData = [
          { name: 'Profitable', value: profitCount, color: '#22c55e' },
          { name: 'Loss', value: lossCount, color: '#ef4444' }
        ]

        return {
          bracketId: bracket.id,
          count: filtered.length,
          totalVolume: totalVol,
          totalPnl: totalPnl,
          profitCount,
          lossCount,
          donutData,
          traders: filtered
        }
      })

      setDistributionResults(bracketStats)
    } catch (error) {
      console.error('[v0] Error filtering data:', error)
      setDistributionResults(null)
    } finally {
      setIsLoadingDistribution(false)
    }
  }

  const handleSearchAddress = async (bracketId?: string) => {
    if (!searchAddress.trim()) return
    setIsSearchingAddress(true)
    try {
      if (allTraders.length === 0) {
        // Use cached data if available
        if (leaderboardCache?.pnlData && leaderboardCache.pnlData.length > 0) {
          setAllTraders(leaderboardCache.pnlData)
        } else {
          // Fetch pnl_leaderboard.csv from GitHub
          const response = await fetch('https://raw.githubusercontent.com/Eliasdegemu61/sodex-finalised-raw-data/refs/heads/main/pnl_leaderboard.csv')
          if (!response.ok) throw new Error('Failed to fetch data')
          const csvText = await response.text()

          // Parse CSV
          const lines = csvText.trim().split('\n')
          if (lines.length < 2) throw new Error('Empty CSV data')

          const headers = lines[0].split(',').map(h => h.trim())
          const traders: any[] = []

          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim())
            const obj: any = {}
            headers.forEach((header, index) => {
              obj[header] = values[index] || ''
            })
            traders.push({
              userId: obj.userId || obj.user_id || '',
              address: obj.address || '',
              pnl: obj.pnl || '0',
              vol: obj.vol || '0',
            })
          }

          setAllTraders(traders)
        }
      }

      const found = allTraders.find(t => (t.address || '').toLowerCase() === searchAddress.toLowerCase())
      if (found) {
        const vol = typeof found.vol === 'string' ? parseFloat(found.vol) : found.vol || 0
        const pnl = typeof found.pnl === 'string' ? parseFloat(found.pnl) : found.pnl || 0

        // Check if address fits in THIS bracket only
        let bracketMatch = null
        if (bracketId && distributionResults) {
          const bracket = brackets.find(b => b.id === bracketId)
          if (bracket) {
            const volMin = bracket.volMin ? parseFloat(bracket.volMin) : -Infinity
            const volMax = bracket.volMax ? parseFloat(bracket.volMax) : Infinity
            const pnlMin = bracket.pnlMin ? parseFloat(bracket.pnlMin) : -Infinity
            const pnlMax = bracket.pnlMax ? parseFloat(bracket.pnlMax) : Infinity
            bracketMatch = vol >= volMin && vol <= volMax && pnl >= pnlMin && pnl <= pnlMax
          }
        }

        setSearchAddressResult({ ...found, vol, pnl, matchesBracket: bracketMatch })
      } else {
        setSearchAddressResult({ notFound: true })
      }
    } catch (error) {
      console.error('[v0] Error searching address:', error)
      setSearchAddressResult(null)
    } finally {
      setIsSearchingAddress(false)
    }
  }

  const handleReverseSearch = async () => {
    if (!reversePrefix || !reverseSuffix) return
    setIsLoadingReverse(true)
    try {
      // Fetch registry.json from GitHub to get address -> userId mapping
      const response = await fetch('https://raw.githubusercontent.com/Eliasdegemu61/Sodex-Tracker-new-v1/refs/heads/main/registry.json')
      if (!response.ok) throw new Error('Failed to fetch registry')
      const registry: any[] = await response.json()

      const prefix = reversePrefix.toLowerCase()
      const suffix = reverseSuffix.toLowerCase()

      // Filter addresses matching the prefix and suffix pattern
      const matched = registry.filter(entry => {
        const addr = (entry.address || '').toLowerCase()
        return addr.length >= 8 && addr.startsWith(prefix) && addr.endsWith(suffix)
      })

      setReverseResults(matched)
    } catch (error) {
      console.error('[v0] Error searching addresses:', error)
      setReverseResults([])
    } finally {
      setIsLoadingReverse(false)
    }
  }

  return (
    <div>
      <div className="border-b border-border bg-card/30 sticky top-0 z-40">
        <div className="px-3 md:px-6 flex gap-4">
          <button
            onClick={() => setActiveTab('distribution')}
            className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'distribution'
              ? 'text-accent border-accent'
              : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
          >
            Distribution Analyzer
          </button>
          <button
            onClick={() => setActiveTab('reverse')}
            className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'reverse'
              ? 'text-accent border-accent'
              : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
          >
            Reverse Search address
          </button>
          <button
            onClick={() => setActiveTab('pnl')}
            className={`px-4 py-3 font-medium text-sm transition-all border-b-2 ${activeTab === 'pnl'
              ? 'text-accent border-accent'
              : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
          >
            PNL Analyzer
          </button>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {activeTab === 'distribution' && (
          <>
            <Card className="p-8 md:p-10 bg-card/20 dark:bg-[#141414]/90 border border-border/20 dark:border-white/5 rounded-[2rem] shadow-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-foreground dark:text-white mb-8 tracking-tight">Distribution Analyzer</h2>
              <div className="space-y-4">
                {brackets.map((bracket, idx) => (
                  <div key={bracket.id} className="p-6 bg-secondary/10 dark:bg-[#1a1a1a] rounded-2xl border border-transparent dark:border-white/5">
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-xs font-bold text-foreground/80 dark:text-white/80">Bracket {idx + 1}</span>
                      {brackets.length > 1 && (
                        <button
                          onClick={() => removeBracket(bracket.id)}
                          className="text-xs text-red-500/80 hover:text-red-400 transition-colors bg-red-500/10 px-2.5 py-1 rounded-md font-medium"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-semibold text-muted-foreground/60 dark:text-white/40 uppercase tracking-wider block">Vol Min</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={bracket.volMin}
                          onChange={(e) => updateBracket(bracket.id, 'volMin', e.target.value)}
                          className="w-full bg-transparent border-none text-sm font-medium text-foreground dark:text-white placeholder:text-muted-foreground/30 focus:outline-none focus:ring-0 p-0"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-semibold text-muted-foreground/60 dark:text-white/40 uppercase tracking-wider block">Vol Max</label>
                        <input
                          type="number"
                          placeholder="∞"
                          value={bracket.volMax}
                          onChange={(e) => updateBracket(bracket.id, 'volMax', e.target.value)}
                          className="w-full bg-transparent border-none text-sm font-medium text-foreground dark:text-white placeholder:text-muted-foreground/30 focus:outline-none focus:ring-0 p-0"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-semibold text-muted-foreground/60 dark:text-white/40 uppercase tracking-wider block">PnL Min</label>
                        <input
                          type="number"
                          placeholder="-∞"
                          value={bracket.pnlMin}
                          onChange={(e) => updateBracket(bracket.id, 'pnlMin', e.target.value)}
                          className="w-full bg-transparent border-none text-sm font-medium text-foreground dark:text-white placeholder:text-muted-foreground/30 focus:outline-none focus:ring-0 p-0"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-semibold text-muted-foreground/60 dark:text-white/40 uppercase tracking-wider block">PnL Max</label>
                        <input
                          type="number"
                          placeholder="∞"
                          value={bracket.pnlMax}
                          onChange={(e) => updateBracket(bracket.id, 'pnlMax', e.target.value)}
                          className="w-full bg-transparent border-none text-sm font-medium text-foreground dark:text-white placeholder:text-muted-foreground/30 focus:outline-none focus:ring-0 p-0"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-6 mt-6 pt-2">
                  <button onClick={addBracket} className="text-xs font-bold text-foreground/80 dark:text-white/80 hover:text-foreground dark:hover:text-white transition-colors">
                    + Add Bracket
                  </button>
                  <button onClick={handleApply} disabled={isLoadingDistribution} className="px-6 py-2 bg-foreground text-background dark:bg-white dark:text-black rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-opacity">
                    {isLoadingDistribution ? 'Applying...' : 'Apply'}
                  </button>
                </div>
              </div>
            </Card>

            {distributionResults && Array.isArray(distributionResults) && (
              <div className="space-y-4">
                {distributionResults.map((bracketResult, idx) => (
                  <Card key={bracketResult.bracketId} className="p-6 bg-card/95 shadow-sm border border-border/20 rounded-3xl shadow-sm hover:border-accent/10 transition-all">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Left: Stats */}
                      <div>
                        <h3 className="text-xs md:text-sm font-bold mb-3">Bracket {idx + 1}</h3>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Traders</span>
                            <span className="font-bold">{bracketResult.count}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Volume</span>
                            <span className="font-bold text-accent">${(bracketResult.totalVolume / 1e6).toFixed(1)}M</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total PnL</span>
                            <span className={`font-bold ${bracketResult.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              ${(bracketResult.totalPnl / 1e6).toFixed(1)}M
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Profitable</span>
                            <span className="font-bold text-green-400">{bracketResult.profitCount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Loss</span>
                            <span className="font-bold text-red-400">{bracketResult.lossCount}</span>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Donut Chart */}
                      <div className="flex justify-center items-center">
                        <style>{`
                          .donut-segment {
                            filter: drop-shadow(0 0 4px currentColor);
                          }
                          .recharts-tooltip-wrapper {
                            outline: none !important;
                          }
                          .recharts-default-tooltip {
                            background-color: #1a1a1a !important;
                            border: 1px solid #333 !important;
                            border-radius: 4px !important;
                          }
                          .recharts-tooltip-label {
                            color: #ffffff !important;
                          }
                          .recharts-tooltip-item {
                            color: #ffffff !important;
                          }
                        `}</style>
                        <ResponsiveContainer width="100%" height={180}>
                          <PieChart>
                            <Pie
                              data={bracketResult.donutData}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={2}
                              dataKey="value"
                              stroke="none"
                            >
                              {bracketResult.donutData.map((entry: any, index: number) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.color}
                                  className="donut-segment"
                                  style={{
                                    filter: `drop-shadow(0 0 4px ${entry.color})`,
                                  } as React.CSSProperties}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#1a1a1a',
                                border: '1px solid #333',
                                color: '#ffffff'
                              }}
                              labelStyle={{ color: '#ffffff' }}
                              formatter={(value: any, name: any) => [`${value} traders`, name]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Right: Search Box */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground">Search Address</p>
                        <Input
                          placeholder="Enter wallet address"
                          value={searchAddress}
                          onChange={(e) => setSearchAddress(e.target.value)}
                          className="h-8 text-xs"
                          onKeyDown={(e) => e.key === 'Enter' && handleSearchAddress(bracketResult.bracketId)}
                        />
                        <Button
                          onClick={() => handleSearchAddress(bracketResult.bracketId)}
                          disabled={isSearchingAddress}
                          size="sm"
                          className="w-full h-8 text-xs"
                        >
                          {isSearchingAddress ? 'Checking...' : 'Check'}
                        </Button>
                        {searchAddressResult && (
                          <div className="text-xs p-2 bg-secondary/30 rounded border border-border">
                            {searchAddressResult.notFound ? (
                              <p className="text-red-400">Not found</p>
                            ) : (
                              <div className="space-y-1">
                                <p className="font-mono text-xs truncate">{searchAddressResult.address}</p>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Vol:</span>
                                  <span className="font-bold">${searchAddressResult.vol.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">PnL:</span>
                                  <span className={`font-bold ${searchAddressResult.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    ${searchAddressResult.pnl.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Fits:</span>
                                  <span className={`font-bold ${searchAddressResult.matchesBracket ? 'text-green-400' : 'text-red-400'}`}>
                                    {searchAddressResult.matchesBracket ? '✓' : '✗'}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'reverse' && (
          <Card className="p-8 md:p-10 bg-card/20 dark:bg-[#141414]/90 border border-border/20 dark:border-white/5 rounded-[2rem] shadow-2xl">
            <h2 className="text-xl md:text-2xl font-bold text-foreground dark:text-white mb-8 tracking-tight">Reverse Search</h2>
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground/80 dark:text-white/80 block mb-2">First 4 Characters</label>
                  <input
                    placeholder="e.g., 0x1a"
                    maxLength={4}
                    value={reversePrefix}
                    onChange={(e) => setReversePrefix(e.target.value.toUpperCase())}
                    className="w-full bg-transparent border-none text-sm font-mono text-muted-foreground dark:text-white/60 placeholder:text-muted-foreground/30 focus:outline-none focus:ring-0 p-0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground/80 dark:text-white/80 block mb-2">Last 4 Characters</label>
                  <input
                    placeholder="e.g., a2f4"
                    maxLength={4}
                    value={reverseSuffix}
                    onChange={(e) => setReverseSuffix(e.target.value.toUpperCase())}
                    className="w-full bg-transparent border-none text-sm font-mono text-muted-foreground dark:text-white/60 placeholder:text-muted-foreground/30 focus:outline-none focus:ring-0 p-0"
                  />
                </div>
              </div>
              <button onClick={handleReverseSearch} disabled={isLoadingReverse} className="w-full md:w-auto px-8 py-2.5 bg-foreground text-background dark:bg-white dark:text-black rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity">
                {isLoadingReverse ? 'Searching...' : 'Search'}
              </button>

              {reverseResults.length > 0 && (
                <div className="mt-8 space-y-3">
                  <p className="text-sm text-muted-foreground">Found {reverseResults.length} matching addresses</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left">
                          <th className="px-3 py-2 font-semibold">Address</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reverseResults.map((trader, i) => (
                          <tr key={i} className="border-b border-border/50 hover:bg-secondary/20">
                            <td className="px-3 py-2 font-mono text-xs">{trader.address || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {activeTab === 'pnl' && (
          <div className="space-y-6">
            <VolumeRangeCard />
          </div>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { theme, toggleTheme, mounted } = useTheme()
  const [currentPage, setCurrentPage] = useState<'dex-status' | 'tracker' | 'portfolio' | 'leaderboard' | 'analyzer' | 'about' | 'whale-tracker' | 'assets'>('dex-status')
  const [searchAddressInput, setSearchAddressInput] = useState('')
  const [trackerSearchAddress, setTrackerSearchAddress] = useState('')
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Handle tab parameter from URL - lazy load only when user navigates
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  }, []);

  // Handle tab parameter from URL - lazy load only when user navigates
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get('tab') as any;
    const addressParam = searchParams.get('address');

    // Set tracker search address if provided
    if (addressParam) {
      setTrackerSearchAddress(decodeURIComponent(addressParam));
    }

    if (tabParam && ['dex-status', 'tracker', 'portfolio', 'leaderboard', 'analyzer', 'about', 'whale-tracker', 'assets'].includes(tabParam)) {
      setCurrentPage(tabParam);
    } else {
      // Default to dex-status on first load
      setCurrentPage('dex-status');
    }
  }, []);

  // Reset scroll position when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentPage]);

  const handleSearchBarSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchAddressInput.trim()) {
      setTrackerSearchAddress(searchAddressInput)
      setCurrentPage('tracker')
      setSearchAddressInput('')
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-card/50 sticky top-0 z-50">
        <div className="flex items-center justify-between h-16 px-3 md:px-6 gap-2 md:gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <img
              src={theme === 'dark' ? 'https://sodex.com/_next/image?url=%2Flogo%2Flogo.webp&w=256&q=75' : 'https://testnet.sodex.com/assets/SoDEX-Dh5Mk-Pl.svg'}
              alt="Sodex Logo"
              className="h-7 w-auto object-contain"
              loading="eager"
              decoding="async"
            />
            <span className="text-xs md:text-sm font-semibold text-foreground">Tracker</span>
          </div>


          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => setCurrentPage('dex-status')}
              className={`text-xs md:text-sm border-b-2 transition-all pb-1 font-semibold ${currentPage === 'dex-status'
                ? 'text-foreground border-b-orange-400'
                : 'text-foreground border-transparent hover:text-orange-400 hover:border-b-orange-400'
                }`}
            >
              SoDex Status
            </button>
            <button
              onClick={() => setCurrentPage('tracker')}
              className={`text-xs md:text-sm border-b-2 transition-all pb-1 ${currentPage === 'tracker'
                ? 'text-foreground border-b-orange-400'
                : 'text-foreground border-transparent hover:text-orange-400 hover:border-b-orange-400'
                }`}
            >
              Tracker
            </button>
            <button
              onClick={() => setCurrentPage('portfolio')}
              className={`text-xs md:text-sm border-b-2 transition-all pb-1 ${currentPage === 'portfolio'
                ? 'text-foreground border-b-orange-400'
                : 'text-foreground border-transparent hover:text-orange-400 hover:border-b-orange-400'
                }`}
            >
              Portfolio
            </button>
            <button
              onClick={() => setCurrentPage('leaderboard')}
              className={`text-xs md:text-sm border-b-2 transition-all pb-1 ${currentPage === 'leaderboard'
                ? 'text-foreground border-b-orange-400'
                : 'text-foreground border-transparent hover:text-orange-400 hover:border-b-orange-400'
                }`}
            >
              Leaderboard
            </button>
            <button
              onClick={() => setCurrentPage('analyzer')}
              className={`text-xs md:text-sm border-b-2 transition-all pb-1 ${currentPage === 'analyzer'
                ? 'text-foreground border-b-orange-400'
                : 'text-foreground border-transparent hover:text-orange-400 hover:border-b-orange-400'
                }`}
            >
              Analyzer
            </button>
            {/* More Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setShowMoreMenu(true)}
              onMouseLeave={() => setShowMoreMenu(false)}
            >
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className={`flex items-center gap-1 text-xs md:text-sm border-b-2 transition-all pb-1 ${currentPage === 'about' || currentPage === 'whale-tracker' || currentPage === 'assets'
                  ? 'text-foreground border-b-orange-400 font-bold'
                  : 'text-foreground border-transparent hover:text-orange-400 hover:border-b-orange-400'
                  }`}
              >
                More
                <ChevronDown className={`w-4 h-4 transition-transform ${showMoreMenu ? 'rotate-180' : ''}`} />
              </button>

              {showMoreMenu && (
                <div className="absolute top-full left-0 pt-2 w-48 z-50">
                  <div className="bg-card border border-border rounded-xl shadow-xl py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <button
                      onClick={() => { setCurrentPage('assets'); setShowMoreMenu(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-secondary transition-colors ${currentPage === 'assets' ? 'text-accent font-bold' : 'text-foreground'
                        }`}
                    >
                      Assets
                    </button>
                    <button
                      onClick={() => { setCurrentPage('about'); setShowMoreMenu(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-secondary transition-colors ${currentPage === 'about' ? 'text-accent font-bold' : 'text-foreground'
                        }`}
                    >
                      What is SoDEX
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>



          <div className="flex items-center gap-2 md:gap-4">
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="text-muted-foreground hover:text-foreground h-9 w-9"
              >
                {theme === 'light' ? (
                  <Moon className="w-5 h-5" />
                ) : (
                  <Sun className="w-5 h-5" />
                )}
              </Button>
            )}
            <a href="https://sodex.com/join/TRADING" target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" className="hidden md:flex items-center gap-2 text-foreground hover:bg-secondary px-3 h-9">
                <img
                  src="https://ssi.sosovalue.com/_next/image?url=%2Fimages%2Fwhat-is-soso%2F%24soso.png&w=256&q=75"
                  alt="SOSO"
                  className="w-5 h-5"
                />
                <span className="text-sm font-semibold text-accent">Trade</span>
              </Button>
            </a>
            <MobileNavMenu currentPage={currentPage} onNavigate={(page: any) => setCurrentPage(page)} />
          </div>
        </div>
      </header>

      {/* Main Content - Only render active tab */}
      {
        currentPage === 'dex-status' && (
          <Suspense fallback={<div className="w-full h-screen flex items-center justify-center"><div className="text-muted-foreground">Loading SoDex Status...</div></div>}>
            <div className="flex flex-col w-full overflow-y-auto overflow-x-hidden">
              <div className="flex flex-col lg:flex-row w-full">
                {/* Top Stats - Mobile Only */}
                <div className="w-full lg:hidden p-3 order-0 border-b border-border">
                  <DashboardStats variant="compact" />
                </div>

                {/* Left Sidebar - Desktop Only */}
                {!isMobile && (
                  <div className="hidden lg:block lg:w-64 p-3 md:p-4 space-y-4 lg:flex-shrink-0 lg:order-1">
                    {/* Key Metrics */}
                    <DashboardStats />

                    {/* Overall Profit Efficiency */}
                    <TVLCard />



                    {/* Trade on SoDex Promo Card (Moved to Left) */}
                    <div className="relative overflow-hidden rounded-lg border border-border hover:border-accent/50 transition-all duration-300 group">
                      <img
                        src="https://sodex.com/_next/image?url=%2Fimg%2Fhome%2Fcontent1-inner.webp&w=1920&q=75"
                        alt="Trade on SoDex"
                        className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                      <div className="absolute inset-0 flex flex-col items-center justify-end p-4">
                        <a
                          href="https://sodex.com/join/TRADING"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full"
                        >
                          <button
                            type="button"
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors duration-200 font-sans"
                          >
                            Trade on SoDex
                          </button>
                        </a>
                      </div>
                    </div>

                    {/* Announcements */}
                    <AnnouncementsPanel />
                  </div>
                )}

                {/* Center Content */}
                <div className="flex-1 p-2 md:p-6 space-y-2 md:space-y-4 lg:flex-shrink-0 order-1 lg:order-2">
                  <VolumeChart />
                  <TodayTopPairs />
                  <FundFlowChart />

                  {/* Key Metrics: Top Spot Traders, Top Gainers, Top Losers */}</div>

                {/* Mobile Cards Section - Correct order for mobile */}
                <div className="lg:hidden order-2 p-2 space-y-3 w-full">
                  {/* Total Value Locked */}
                  <TVLCard />
                  {/* Announcements */}
                  <AnnouncementsPanel />

                  {/* Trade on SoDex Promo at bottom */}
                  <div className="relative overflow-hidden rounded-lg border border-border hover:border-accent/50 transition-all duration-300 group">
                    <img
                      src="https://sodex.com/_next/image?url=%2Fimg%2Fhome%2Fcontent1-inner.webp&w=1920&q=75"
                      alt="Trade on SoDex"
                      className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    <div className="absolute inset-0 flex flex-col items-center justify-end p-4">
                      <a
                        href="https://sodex.com/join/TRADING"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full"
                      >
                        <button
                          type="button"
                          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors duration-200 font-sans"
                        >
                          Trade on SoDex
                        </button>
                      </a>
                    </div>
                  </div>
                </div>

              </div>

              {/* Full Width Bottom Content */}
              <div className="w-full p-2 md:p-6 lg:pt-0">
                {/* Historical Dominance (TopTradingPairs) */}
                <TopPairsWidget />
              </div>
            </div>
          </Suspense>
        )
      }

      {
        currentPage === 'tracker' && (
          <Suspense fallback={<LoadingCard />}>
            <div className="p-4 md:p-6 overflow-y-auto w-full">
              <TrackerSection initialSearchAddress={trackerSearchAddress} />
            </div>
          </Suspense>
        )
      }

      {
        currentPage === 'portfolio' && (
          <Suspense fallback={<LoadingCard />}>
            <div className="p-4 md:p-6 overflow-y-auto w-full space-y-6">
              <PortfolioSection />
            </div>
          </Suspense>
        )
      }

      {
        currentPage === 'leaderboard' && (
          <Suspense fallback={<LoadingCard />}>
            <LeaderboardPage onBack={() => setCurrentPage('dex-status')} />
          </Suspense>
        )
      }

      {
        currentPage === 'analyzer' && (
          <Suspense fallback={<LoadingCard />}>
            <div className="p-4 md:p-6">
              <DistributionAnalyzerPage onBack={() => setCurrentPage('dex-status')} />
            </div>
          </Suspense>
        )
      }


      {
        currentPage === 'about' && (
          <Suspense fallback={<LoadingCard />}>
            <AboutSodex />
          </Suspense>
        )
      }

      {
        currentPage === 'assets' && (
          <Suspense fallback={<LoadingCard />}>
            <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
              <div className="flex flex-col gap-1 mb-2">
                <h1 className="text-2xl font-bold text-foreground">Assets</h1>
                <p className="text-sm text-muted-foreground">Track token flow and net retention on SoDex.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <OverallDepositsCard />
                <NetRemainingCard />
              </div>
            </div>
          </Suspense>
        )
      }

      {/* Announcement Side Panel */}
      <AnnouncementSidePanel />

      {/* Footer - Only show on relevant pages */}
      {
        (currentPage === 'dex-status' || currentPage === 'about' || currentPage === 'assets') && (
          <Footer />
        )
      }
    </div >
  )
}
