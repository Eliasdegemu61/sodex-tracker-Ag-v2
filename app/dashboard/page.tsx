// Cache busted: v3
'use client';

import React from "react"

import { Suspense, useState, lazy, useEffect } from 'react'
import { Search, Bell, ChevronDown, Lock, Unlock, MessageCircle, MoreVertical, Moon, Sun } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/app/providers'
import { DashboardStats } from '@/components/dashboard-stats'
import { VolumeChart } from '@/components/volume-chart'
import { FundFlowChart } from '@/components/fund-flow-chart'
import { TopPairsWidget } from '@/components/top-pairs-widget'
import { TodayTopPairs } from '@/components/today-top-pairs'
import { TopTradersCard } from '@/components/top-traders-card'
import { TopSpotTradersCard } from '@/components/top-spot-traders-card'
import { OverallDepositsCard, NetRemainingCard } from '@/components/overall-token-flow'
import { TopGainersCard } from '@/components/top-gainers-card'
import { TopLosersCard } from '@/components/top-losers-card'
import { LeaderboardPage } from '@/components/leaderboard-page'
import { ProfitEfficiencyCard } from '@/components/profit-efficiency-card'
import { OverallProfitEfficiencyCard } from '@/components/overall-profit-efficiency-card'
import { TVLCard } from '@/components/tvl-card'
import { VolumeRangeCard } from '@/components/volume-range-card'
import { AnnouncementsPanel } from '@/components/announcements-panel'
import { MobileNavMenu } from '@/components/mobile-nav-menu'
import { AnnouncementSidePanel } from '@/components/announcement-side-panel'
import { TrackerSection } from '@/components/tracker-section'
import { Footer } from '@/components/footer'
import { useSessionCache } from '@/context/session-cache-context'

function LoadingCard() {
  return <Card className="p-4 md:p-6 bg-card border border-border h-64 animate-pulse" />
}

function ReverseSearchPage({ onBack }: { onBack: () => void }) {
  const [reversePrefix, setReversePrefix] = useState('')
  const [reverseSuffix, setReverseSuffix] = useState('')
  const [reverseResults, setReverseResults] = useState<any[]>([])
  const [isLoadingReverse, setIsLoadingReverse] = useState(false)

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
    <div className="p-4 md:p-6 space-y-6">
      <Card className="p-8 md:p-10 bg-card/20 dark:bg-[#141414]/90 border border-border/20 dark:border-white/5 rounded-[2rem] shadow-2xl">
        <h2 className="text-xl md:text-2xl font-bold text-foreground dark:text-white mb-8 tracking-tight">Reverse Search Address</h2>
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground/80 dark:text-white/80 block mb-2">First 4 Characters</label>
              <input
                placeholder="0x1a"
                maxLength={4}
                value={reversePrefix}
                onChange={(e) => setReversePrefix(e.target.value.toUpperCase())}
                className="w-full bg-white/[0.03] border border-white/5 rounded-xl text-sm font-mono text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-orange-500/30 p-3 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground/80 dark:text-white/80 block mb-2">Last 4 Characters</label>
              <input
                placeholder="a2f4"
                maxLength={4}
                value={reverseSuffix}
                onChange={(e) => setReverseSuffix(e.target.value.toUpperCase())}
                className="w-full bg-white/[0.03] border border-white/5 rounded-xl text-sm font-mono text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-orange-500/30 p-3 transition-all"
              />
            </div>
          </div>
          <button
            onClick={handleReverseSearch}
            disabled={isLoadingReverse}
            className="w-full md:w-auto px-8 py-2.5 bg-foreground text-background dark:bg-white dark:text-black rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
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
                      <th className="px-3 py-2 font-semibold text-right">Volume</th>
                      <th className="px-3 py-2 font-semibold text-right">PnL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reverseResults.map((trader, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-secondary/20">
                        <td className="px-3 py-2 text-xs font-mono">{trader.address || 'N/A'}</td>
                        <td className="px-3 py-2 text-right">${typeof trader.vol === 'string' ? parseFloat(trader.vol).toFixed(0) : (trader.vol || 0).toLocaleString()}</td>
                        <td className={`px-3 py-2 text-right ${(trader.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          ${typeof trader.pnl === 'string' ? parseFloat(trader.pnl).toFixed(0) : (trader.pnl || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

export default function Dashboard() {
  const { theme, toggleTheme, mounted } = useTheme()
  const { preloadLeaderboardData } = useSessionCache()
  const [currentPage, setCurrentPage] = useState<'dex-status' | 'tracker' | 'leaderboard' | 'analyzer'>('dex-status')
  const [searchAddressInput, setSearchAddressInput] = useState('')
  const [trackerSearchAddress, setTrackerSearchAddress] = useState('')
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  // Preload leaderboard data on mount
  useEffect(() => {
    console.log('[v0] Dashboard mounted, preloading leaderboard data')
    preloadLeaderboardData()
  }, [preloadLeaderboardData])

  // Handle tab parameter from URL - lazy load only when user navigates
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get('tab') as 'dex-status' | 'tracker' | 'leaderboard' | 'analyzer' | null;
    const addressParam = searchParams.get('address');

    // Set tracker search address if provided
    if (addressParam) {
      setTrackerSearchAddress(decodeURIComponent(addressParam));
    }

    if (tabParam && ['dex-status', 'tracker', 'leaderboard', 'analyzer'].includes(tabParam as any)) {
      setCurrentPage(tabParam as any);
    } else {
      // Default to leaderboard on first load (faster load than dex-status)
      setCurrentPage('leaderboard');
    }
  }, []);

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
      <header className="border-b border-white/5 bg-[#0A0A0A]/80 sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between h-20 px-4 md:px-6 gap-3 md:gap-8">
          {/* Logo Section */}
          <div className="flex items-center gap-3 flex-shrink-0 cursor-pointer" onClick={() => setCurrentPage('leaderboard')}>
            <div className="relative">
              <img
                src={theme === 'dark' ? 'https://sodex.com/_next/image?url=%2Flogo%2Flogo.webp&w=256&q=75' : 'https://testnet.sodex.com/assets/SoDEX-Dh5Mk-Pl.svg'}
                alt="Sodex Logo"
                className="h-7 md:h-8 w-auto object-contain"
                loading="eager"
              />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-[10px] md:text-xs font-bold text-orange-500 leading-none">Intelligence</span>
              <span className="text-[10px] md:text-xs font-bold text-white/80 tracking-tight">TERMINAL</span>
            </div>
          </div>

          {/* Search Bar - Visible on Mobile and Desktop */}
          <div className="flex-1 max-w-xl group">
            <div className="relative">
              <div className="absolute inset-y-0 left-3 md:left-4 flex items-center pointer-events-none">
                <Search className="w-3.5 h-3.5 md:w-4 md:h-4 text-white/20 group-focus-within:text-orange-400 transition-colors" />
              </div>
              <Input
                placeholder="Search address"
                className="h-9 md:h-10 pl-9 md:pl-11 pr-4 bg-white/[0.03] border-white/5 focus:border-orange-500/30 focus:ring-0 rounded-xl md:rounded-2xl text-[13px] md:text-sm tracking-tight transition-all placeholder:text-white/20"
                value={searchAddressInput}
                onChange={(e) => setSearchAddressInput(e.target.value)}
                onKeyDown={handleSearchBarSubmit}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <nav className="hidden xl:flex items-center gap-2 mr-2">
              {[
                { id: 'dex-status', label: 'SoDex Status' },
                { id: 'tracker', label: 'Monitor' },
                { id: 'leaderboard', label: 'Rankings' },
                { id: 'analyzer', label: 'Reverse Search' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 ${currentPage === item.id
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                    }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-9 w-9 md:h-10 md:w-10 rounded-xl md:rounded-2xl bg-white/[0.03] border border-white/5 text-white/40 hover:text-orange-400 hover:bg-orange-400/5 transition-all"
              >
                {theme === 'light' ? <Moon className="w-4 h-4 md:w-5 md:h-5" /> : <Sun className="w-4 h-4 md:w-5 md:h-5" />}
              </Button>
            )}

            <div className="hidden md:block h-6 w-[1px] bg-white/5 mx-1" />

            <a href="https://sodex.com/join/TRADING" target="_blank" rel="noopener noreferrer" className="hidden lg:block">
              <Button className="h-10 px-6 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] italic shadow-lg shadow-orange-500/20 transition-all active:scale-95">
                Execute Trade
              </Button>
            </a>

            <MobileNavMenu currentPage={currentPage} onNavigate={(page: any) => setCurrentPage(page)} />
          </div>
        </div>
      </header>


      {/* Main Content - Only render active tab */}
      {currentPage === 'dex-status' && (
        <Suspense fallback={<div className="w-full h-screen flex items-center justify-center"><div className="text-muted-foreground animate-pulse text-[10px] tracking-widest uppercase">Initializing Neural Link...</div></div>}>
          <div className="flex flex-col lg:flex-row w-full max-w-[1800px] mx-auto min-h-[calc(100vh-5rem)]">
            {/* Left Sidebar */}
            <div className="w-full lg:w-[320px] xl:w-[380px] lg:border-r border-border/10 p-6 space-y-6 lg:flex-shrink-0 order-2 lg:order-1 bg-secondary/5 lg:bg-transparent">
              <div className="space-y-6">
                <DashboardStats />
                <TVLCard />
                <TodayTopPairs />
                <div className="pt-2">
                  <TopTradersCard />
                </div>
                <OverallDepositsCard />
              </div>
            </div>

            {/* Center Content */}
            <div className="flex-1 lg:border-r border-border/10 p-6 space-y-6 order-1 lg:order-2">
              <VolumeChart />
              <FundFlowChart />
              <VolumeRangeCard />
              <TopPairsWidget />
            </div>

            {/* Right Sidebar */}
            <div className="w-full lg:w-[320px] xl:w-[380px] p-6 space-y-6 lg:flex-shrink-0 order-3 bg-secondary/5 lg:bg-transparent">
              <AnnouncementsPanel />
              <TopGainersCard />

              <div className="relative group overflow-hidden rounded-[2.5rem] border border-border/20 shadow-2xl transition-all duration-500 hover:border-orange-500/30">
                <img
                  src="https://sodex.com/_next/image?url=%2Fimg%2Fhome%2Fcontent1-inner.webp&w=1920&q=75"
                  alt="Trade"
                  className="w-full h-48 object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
                <div className="absolute inset-0 p-8 flex flex-col justify-between">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400 italic mb-2">Network Access</h4>
                    <p className="text-xs font-bold text-white leading-relaxed">Execute high-frequency trades on the most liquid DEX protocol.</p>
                  </div>
                  <a href="https://sodex.com/join/TRADING" target="_blank" rel="noopener noreferrer">
                    <button className="w-full py-3 bg-white/10 hover:bg-orange-500 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all border border-white/10 hover:border-orange-400">
                      Open Terminal
                    </button>
                  </a>
                </div>
              </div>

              <TopSpotTradersCard />
              <NetRemainingCard />
            </div>
          </div>
        </Suspense>
      )}

      {currentPage === 'tracker' && (
        <Suspense fallback={<LoadingCard />}>
          <div className="p-4 md:p-6 overflow-y-auto w-full">
            <TrackerSection initialSearchAddress={trackerSearchAddress} />
          </div>
        </Suspense>
      )}



      {currentPage === 'leaderboard' && (
        <Suspense fallback={<LoadingCard />}>
          <LeaderboardPage onBack={() => setCurrentPage('dex-status')} />
        </Suspense>
      )}

      {currentPage === 'analyzer' && (
        <Suspense fallback={<LoadingCard />}>
          <div className="p-4 md:p-6">
            <ReverseSearchPage onBack={() => setCurrentPage('dex-status')} />
          </div>
        </Suspense>
      )}




      {/* Announcement Side Panel */}
      <AnnouncementSidePanel />

      {/* Footer */}
      <Footer />
    </div>
  )
}
