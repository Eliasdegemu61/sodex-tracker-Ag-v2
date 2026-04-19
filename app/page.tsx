// Cache busted: v3
'use client';

import React from "react"

import { Suspense, useState, lazy, useEffect } from 'react'
import { Moon, Sun, Activity, TrendingUp, Wallet, Trophy, Zap, Compass, BookOpen, LineChart } from 'lucide-react'
import { cn } from '@/lib/utils'
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
import { NetRemainingCard } from '@/components/overall-token-flow'
import { LeaderboardPage } from '@/components/leaderboard-page'
import { TVLCard } from '@/components/tvl-card'
import { VolumeRangeCard } from '@/components/volume-range-card'
import { AnnouncementsPanel } from '@/components/announcements-panel'
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts'
import { MobileNavMenu } from '@/components/mobile-nav-menu'
import { NewTradersTracker } from '@/components/new-traders-tracker'
import { AnnouncementSidePanel } from '@/components/announcement-side-panel'
import { PortfolioSection } from '@/components/portfolio-section'
import { Loader2 } from 'lucide-react'
import { OverallDepositsCard, AssetsSkeleton } from '@/components/overall-token-flow'

import { TrackerSection } from '@/components/tracker-section'
import { TradeAnalytics } from '@/components/trade-analytics'
import { DemoTrading } from '@/components/demo-trading'
import { Footer } from '@/components/footer'
import { SopointsAnalyzer } from '@/components/sopoints-analyzer'
import { AboutSodex } from '@/components/about-sodex'
import { SidebarNav } from '@/components/sidebar-nav'
import { PortfolioProvider } from '@/context/portfolio-context';
import { JournalPageClient } from '@/components/journal/journal-page-client';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Search, Settings as SettingsIcon } from 'lucide-react'
import { PulseDashboard } from '@/components/pulse-dashboard'

function LoadingCard() {
  return <Card className="p-4 md:p-6 bg-card border border-border h-64 animate-pulse" />
}

function DistributionAnalyzerPage({ onBack }: { onBack: () => void }) {
  const [reversePrefix, setReversePrefix] = useState('')
  const [reverseSuffix, setReverseSuffix] = useState('')
  const [fullResults, setFullResults] = useState<any[]>([])
  const [paginatedResults, setPaginatedResults] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoadingReverse, setIsLoadingReverse] = useState(false)
  const [isLoadingPage, setIsLoadingPage] = useState(false)
  
  const ITEMS_PER_PAGE = 20
  const totalPages = Math.ceil(fullResults.length / ITEMS_PER_PAGE)

  const loadPageData = async (allData: any[], pageNum: number) => {
    setIsLoadingPage(true)
    try {
      const startIndex = (pageNum - 1) * ITEMS_PER_PAGE
      const endIndex = startIndex + ITEMS_PER_PAGE
      const currentSlice = allData.slice(startIndex, endIndex)

      const resultsWithVolume = await Promise.all(
        currentSlice.map(async (item: { address: string; userId: string | number }) => {
          try {
            const volResponse = await fetch(`https://mainnet-data.sodex.dev/api/v1/leaderboard/rank?window_type=ALL_TIME&sort_by=pnl&wallet_address=${item.address}`)
            if (volResponse.ok) {
              const volData = await volResponse.json()
              return {
                ...item,
                volume: volData.data?.item?.volume_usd || 0
              }
            }
          } catch (e) {
            console.error(`Error fetching volume for ${item.address}:`, e)
          }
          return { ...item, volume: 0 }
        })
      )

      setPaginatedResults(resultsWithVolume)
      setCurrentPage(pageNum)
    } finally {
      setIsLoadingPage(false)
    }
  }

  const handleReverseSearch = async () => {
    if (!reversePrefix && !reverseSuffix) return
    setIsLoadingReverse(true)
    try {
      const params = new URLSearchParams()
      if (reversePrefix) params.append('prefix', reversePrefix.toLowerCase())
      if (reverseSuffix) params.append('suffix', reverseSuffix.toLowerCase())

      const response = await fetch(`/api/wallet/reverse-search?${params.toString()}`)
      if (!response.ok) throw new Error('Search failed')

      const { data } = await response.json()
      const matched = data || []
      
      setFullResults(matched)
      
      if (matched.length > 0) {
        await loadPageData(matched, 1)
      } else {
        setPaginatedResults([])
      }
    } catch (error) {
      console.error('[v0] Error searching addresses:', error)
      setFullResults([])
      setPaginatedResults([])
    } finally {
      setIsLoadingReverse(false)
    }
  }

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-500">

      {/* Page Header */}
      <div className="pb-6 border-b border-border">
        <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">Reverse Search</h1>
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.2em]">Find wallet addresses by first or last characters</p>
      </div>

      {/* Search Controls */}
      <div className="bg-background border border-border rounded-xl p-6 sm:p-8 shadow-none space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">First Characters</label>
            <input
              placeholder="e.g. 0x12"
              maxLength={4}
              value={reversePrefix}
              onChange={(e) => setReversePrefix(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleReverseSearch()}
              className="w-full h-10 bg-secondary/5 border border-border rounded-lg px-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-border/80 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Last Characters</label>
            <input
              placeholder="e.g. a2f4"
              maxLength={4}
              value={reverseSuffix}
              onChange={(e) => setReverseSuffix(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleReverseSearch()}
              className="w-full h-10 bg-secondary/5 border border-border rounded-lg px-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-border/80 transition-all"
            />
          </div>
        </div>

        <button
          onClick={handleReverseSearch}
          disabled={isLoadingReverse || (!reversePrefix && !reverseSuffix)}
          className="w-full h-11 bg-foreground text-background rounded-lg font-bold text-[11px] uppercase tracking-[0.2em] hover:bg-foreground/90 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {isLoadingReverse ? (
            <><Loader2 className="w-4 h-4 animate-spin" /><span>Searching...</span></>
          ) : 'Search'}
        </button>
      </div>

      {/* Results */}
      {fullResults.length > 0 && (
        <div className="bg-background border border-border rounded-xl shadow-none overflow-hidden">

          {/* Header */}
          <div className="px-6 py-5 border-b border-border flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-foreground tracking-tight">Results</h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5">{fullResults.length.toLocaleString()} matching addresses</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => loadPageData(fullResults, currentPage - 1)}
                disabled={currentPage === 1 || isLoadingPage}
                className="h-7 w-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/10 disabled:opacity-30 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <span className="px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {currentPage} / {totalPages || 1}
              </span>
              <button
                onClick={() => loadPageData(fullResults, Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages || isLoadingPage}
                className="h-7 w-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/10 disabled:opacity-30 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>

          {/* Table or Loading */}
          {isLoadingPage ? (
            <div className="py-12 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse">Loading volume data...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">#</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Address</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 text-right">All-Time Volume</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {paginatedResults.map((trader, i) => (
                    <tr key={i} className="group hover:bg-secondary/5 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-muted-foreground/30 tabular-nums">{(currentPage - 1) * ITEMS_PER_PAGE + i + 1}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono text-muted-foreground/70 group-hover:text-foreground transition-colors">
                          {trader.address || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-xs font-bold text-foreground tabular-nums">
                          {trader.volume !== undefined
                            ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(trader.volume))
                            : <span className="text-muted-foreground/30">—</span>}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { theme, toggleTheme, mounted } = useTheme()
  const [currentPage, setCurrentPage] = useState<'dex-status' | 'tracker' | 'portfolio' | 'leaderboard' | 'analyzer' | 'about' | 'whale-tracker' | 'assets' | 'journal' | 'analytics' | 'demo-trading' | 'pulse'>('dex-status')
  const [searchAddressInput, setSearchAddressInput] = useState('')
  const [trackerSearchAddress, setTrackerSearchAddress] = useState('')
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  const navItems = [
    { id: 'dex-status', label: 'SoDex Status', icon: Activity },
    { id: 'tracker', label: 'Tracker', icon: TrendingUp },
    { id: 'portfolio', label: 'Portfolio', icon: Wallet },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'analyzer', label: 'Reverse Search', icon: Zap },
    { id: 'analytics', label: 'Trade analytics', icon: LineChart },
    { id: 'assets', label: 'Assets', icon: Compass },
  ] as const;

  // Handle scroll for liquid design
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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

    if (tabParam && ['dex-status', 'tracker', 'portfolio', 'leaderboard', 'analyzer', 'about', 'whale-tracker', 'assets', 'analytics', 'demo-trading', 'pulse'].includes(tabParam)) {
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
    <SidebarProvider>
      <div className={cn(
        "flex min-h-screen w-full font-sans transition-colors duration-500",
        theme === 'light' ? "bg-[#F5F5F7]" : "bg-black"
      )}>
        {/* Sidebar Navigation */}
        <SidebarNav currentPage={currentPage} onNavigate={setCurrentPage} />

        {/* Main Content Area */}
        <SidebarInset className={cn(
          "flex-1 flex flex-col min-h-screen overflow-hidden relative transition-colors duration-500",
          theme === 'light' ? "bg-[#F5F5F7]" : "bg-black"
        )}>
          
          {/* Top Header / Search Bar */}
          <header className={cn(
            "sticky top-0 z-40 w-full transition-all duration-300 border-b",
            theme === 'light' 
              ? (isScrolled ? "bg-white/80 backdrop-blur-xl border-black/5" : "bg-white border-black/5") 
              : (isScrolled ? "bg-black/80 backdrop-blur-xl border-white/5" : "bg-black border-white/5"),
            isScrolled ? "py-3" : "py-4"
          )}>
            <div className="container px-6 flex items-center justify-between gap-4 max-w-full">
              {/* Left Side: Search Bar */}
              <div className="flex items-center gap-4 flex-1">
                <div className="relative w-full max-w-[140px] sm:max-w-md group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchAddressInput}
                    onChange={(e) => setSearchAddressInput(e.target.value)}
                    onKeyDown={handleSearchBarSubmit}
                    className="w-full bg-secondary/30 border border-border/50 rounded-xl pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-border/50 transition-all"
                  />
                </div>
              </div>

              {/* Right Side: Actions */}
              <div className="flex items-center gap-3">
                
                {mounted && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    className="text-muted-foreground hover:text-white hover:bg-white/5 rounded-xl"
                  >
                    {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  </Button>
                )}

                <a href="https://sodex.com/join/TRADING" target="_blank" rel="noopener noreferrer" className="ml-1 sm:ml-2">
                  <button className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg border border-border text-foreground text-[10px] sm:text-xs font-bold uppercase tracking-widest hover:bg-secondary/10 transition-all">
                    <span className="hidden sm:inline">Trade</span>
                    <svg className="w-3.5 h-3.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </button>
                </a>

                {/* Mobile Navigation Toggle (Top Right) */}
                <div className="lg:hidden">
                  <MobileNavMenu currentPage={currentPage} onNavigate={setCurrentPage as any} />
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className={cn(
            "flex-1 overflow-y-auto scroll-smooth p-6",
            "lg:max-w-[1600px] lg:mx-auto w-full"
          )}>
            {/* Conditional Rendering of Tabs */}
            <div className="space-y-8 animate-in fade-in duration-500">
              {currentPage === 'dex-status' && (
                <Suspense fallback={<div className="w-full h-[60vh] flex items-center justify-center text-muted-foreground">Loading Status...</div>}>
                  <div className="space-y-8">
                    {/* Hero Section / Welcome */}
                    <div className="flex flex-col gap-1">
                      <div className="lg:hidden flex items-center gap-3 mb-2">
                        <img 
                          src={theme === 'dark' 
                            ? "https://sodex.com/_next/image?url=%2Flogo%2Flogo.webp&w=256&q=75"
                            : "https://testnet.sodex.com/assets/SoDEX-Dh5Mk-Pl.svg"} 
                          alt="SoDEX Logo" 
                          className="h-8 w-auto object-contain" 
                        />
                        <span className="text-sm font-bold tracking-tight text-foreground mb-0.5 translate-y-[1px]">Tracker</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 md:gap-6">
                      {/* Dashboard Stats as Top Summary Cards */}
                      <DashboardStats variant="compact" />
                      <TVLCard />
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      <VolumeChart />
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      <TodayTopPairs />
                      <FundFlowChart />
                    </div>

                    <TopPairsWidget />
                  </div>
                </Suspense>
              )}

              {currentPage === 'tracker' && (
                <Suspense fallback={<LoadingCard />}>
                  <TrackerSection initialSearchAddress={trackerSearchAddress} />
                </Suspense>
              )}

              {currentPage === 'portfolio' && (
                <Suspense fallback={<LoadingCard />}>
                  <PortfolioSection />
                </Suspense>
              )}

              {currentPage === 'leaderboard' && (
                <Suspense fallback={<LoadingCard />}>
                  <LeaderboardPage onBack={() => setCurrentPage('dex-status')} />
                </Suspense>
              )}

              {currentPage === 'analyzer' && (
                <Suspense fallback={<LoadingCard />}>
                  <DistributionAnalyzerPage onBack={() => setCurrentPage('dex-status')} />
                </Suspense>
              )}

              {currentPage === 'assets' && (
                <Suspense fallback={<AssetsSkeleton />}>
                  <div className="space-y-6">
                    <OverallDepositsCard />
                  </div>
                </Suspense>
              )}

              {currentPage === 'about' && (
                <Suspense fallback={<LoadingCard />}>
                  <AboutSodex />
                </Suspense>
              )}

              {currentPage === 'journal' && (
                <Suspense fallback={<LoadingCard />}>
                  <PortfolioProvider>
                    <JournalPageClient isDashboard />
                  </PortfolioProvider>
                </Suspense>
              )}

              {currentPage === 'analytics' && (
                <Suspense fallback={<LoadingCard />}>
                  <TradeAnalytics />
                </Suspense>
              )}

              {currentPage === 'demo-trading' && (
                <Suspense fallback={<LoadingCard />}>
                  <DemoTrading />
                </Suspense>
              )}

              {currentPage === 'pulse' && (
                <Suspense fallback={<LoadingCard />}>
                  <PulseDashboard />
                </Suspense>
              )}
            </div>

            {/* Mobile Footer (Contact Links) */}
            <div className="md:hidden mt-12 pb-12 pt-8 border-t border-border/10 flex flex-col items-center gap-6">
              <div className="flex items-center gap-6">
                <a href="https://x.com/eliasing__" target="_blank" rel="noopener noreferrer" className="text-muted-foreground/40 hover:text-foreground transition-all hover:scale-110 active:scale-90">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="https://t.me/fallphile" target="_blank" rel="noopener noreferrer" className="text-muted-foreground/40 hover:text-foreground transition-all hover:scale-110 active:scale-90">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                </a>
              </div>
              <p className="text-[8px] text-muted-foreground/20 text-center max-w-[280px] font-bold uppercase tracking-[0.2em] leading-relaxed">
                Trading involves significant risk. SoDex tracker is for informational purposes only.
              </p>
            </div>
          </main>
          
          {/* Global Announcement Overlays */}
          <AnnouncementSidePanel />
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
// Deployment Nudge: 03/14/2026 17:42:03
// Final Sync: 03/14/2026 17:45:42
