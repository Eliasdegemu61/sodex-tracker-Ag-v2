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
  const [reversePrefix, setReversePrefix] = useState('')
  const [reverseSuffix, setReverseSuffix] = useState('')
  const [reverseResults, setReverseResults] = useState<any[]>([])
  const [isLoadingReverse, setIsLoadingReverse] = useState(false)

  const handleReverseSearch = async () => {
    if (!reversePrefix && !reverseSuffix) return
    setIsLoadingReverse(true)
    try {
      const { fetchRegistryFromServer } = await import('@/lib/client-api')
      const registry = await fetchRegistryFromServer()

      const prefix = reversePrefix.toLowerCase()
      const suffix = reverseSuffix.toLowerCase()

      const matched = registry.filter(entry => {
        const addr = (entry.address || '').toLowerCase()
        if (prefix && suffix) {
          return addr.startsWith(prefix) && addr.endsWith(suffix)
        } else if (prefix) {
          return addr.startsWith(prefix)
        } else if (suffix) {
          return addr.endsWith(suffix)
        }
        return false
      })

      // Fetch volume for the first 20 matches to avoid overwhelming the API
      const limitedMatches = matched.slice(0, 20)
      const resultsWithVolume = await Promise.all(
        limitedMatches.map(async (item) => {
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

      setReverseResults(resultsWithVolume)
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
        <h2 className="text-xl md:text-2xl font-bold text-foreground dark:text-white mb-2 tracking-tight">Reverse Search</h2>
        <p className="text-sm text-muted-foreground mb-8">Add either the last or first or both characters to find matching addresses on SoDex database</p>
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground/80 dark:text-white/80 block mb-2">first characters</label>
              <input
                placeholder=""
                maxLength={4}
                value={reversePrefix}
                onChange={(e) => setReversePrefix(e.target.value.toUpperCase())}
                className="w-full bg-secondary/20 border border-border/50 rounded-xl text-sm font-mono text-foreground dark:text-white placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-accent/30 p-3 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground/80 dark:text-white/80 block mb-2">last characters</label>
              <input
                placeholder=""
                maxLength={4}
                value={reverseSuffix}
                onChange={(e) => setReverseSuffix(e.target.value.toUpperCase())}
                className="w-full bg-secondary/20 border border-border/50 rounded-xl text-sm font-mono text-foreground dark:text-white placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-accent/30 p-3 transition-all"
              />
            </div>
          </div>
          <button onClick={handleReverseSearch} disabled={isLoadingReverse} className="w-full md:w-auto px-8 py-2.5 bg-foreground text-background dark:bg-white dark:text-black rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity">
            {isLoadingReverse ? 'Searching...' : 'Search'}
          </button>

          {reverseResults.length > 0 && (
            <div className="mt-8 space-y-3">
              <p className="text-sm text-muted-foreground">Found {reverseResults.length} matching addresses (showing volume for up to 20)</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-3 py-2 font-semibold">Address</th>
                      <th className="px-3 py-2 font-semibold text-right">Volume (All-Time)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reverseResults.map((trader, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-secondary/20">
                        <td className="px-3 py-2 font-mono text-xs">{trader.address || 'N/A'}</td>
                        <td className="px-3 py-2 text-right font-mono text-xs text-accent">
                          {trader.volume !== undefined
                            ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(trader.volume))
                            : 'Loading...'}
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
              Reverse Search
            </button>
            <button
              onClick={() => setCurrentPage('assets')}
              className={`text-xs md:text-sm border-b-2 transition-all pb-1 ${currentPage === 'assets'
                ? 'text-foreground border-b-orange-400'
                : 'text-foreground border-transparent hover:text-orange-400 hover:border-b-orange-400'
                }`}
            >
              Assets
            </button>
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
                <div className="w-full lg:hidden p-2 pt-1 order-0">
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
                <div className="flex-1 p-1 md:p-6 space-y-2 md:space-y-4 lg:flex-shrink-0 order-1 lg:order-2">
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
              <div className="flex flex-col gap-1 mb-8">
                <h1 className="text-3xl font-black text-foreground tracking-tight">SoDex Tokens Analysis</h1>
                <p className="text-sm text-muted-foreground/60 font-medium tracking-tight">analyze deposits and withdrawals of all availalbe tokens on SoDex</p>
                <p className="text-[10px] uppercase font-bold text-muted-foreground/30 mt-1">All USD calculations use current prices</p>
              </div>
              <OverallDepositsCard />
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
