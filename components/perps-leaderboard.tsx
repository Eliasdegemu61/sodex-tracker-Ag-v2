'use client'

import { useState, useEffect } from 'react'
import { Search, ChevronLeft, ChevronRight, Copy, Check, TrendingUp, BarChart2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface LeaderboardEntry {
  rank: number
  account_id: string
  wallet_address: string
  pnl_usd: string
  volume_usd: string
}

type SortType = 'pnl' | 'volume'
type WindowType = '24H' | '7D' | '30D' | 'ALL_TIME'

const formatNumber = (num: number): string => {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`
  return num.toFixed(2)
}

export function PerpsLeaderboard() {
  const [items, setItems] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [sortType, setSortType] = useState<SortType>('pnl')
  const [windowType, setWindowType] = useState<WindowType>('ALL_TIME')
  const [page, setPage] = useState(1)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const [searchAddress, setSearchAddress] = useState('')
  const [searchResult, setSearchResult] = useState<LeaderboardEntry | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  const pageSize = 50

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true)
        const response = await fetch(
          `https://mainnet-data.sodex.dev/api/v1/leaderboard?window_type=${windowType}&sort_by=${sortType}&sort_order=desc&page=${page}&page_size=${pageSize}`
        )
        const json = await response.json()
        if (json.code === 0 && json.data?.items) {
          setItems(json.data.items)
        }
      } catch (error) {
        console.error('Error fetching leaderboard:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchLeaderboard()
  }, [sortType, windowType, page])

  const copyToClipboard = (address: string) => {
    navigator.clipboard.writeText(address)
    setCopiedAddress(address)
    setTimeout(() => setCopiedAddress(null), 2000)
  }

  const handleSearch = async () => {
    if (!searchAddress.trim()) return
    setIsSearching(true)
    setSearchResult(null)
    try {
      const response = await fetch(
        `https://mainnet-data.sodex.dev/api/v1/leaderboard/rank?window_type=${windowType}&sort_by=${sortType}&wallet_address=${searchAddress.trim()}`
      )
      const json = await response.json()
      if (json.code === 0 && json.data?.found && json.data.item) {
        setSearchResult(json.data.item)
      } else {
        // You might want to show a toast or message that address was not found
      }
    } catch (error) {
      console.error('Error searching address rank:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const podiumItems = items.slice(0, 3)
  const tableItems = items // Integration: show all items in the table

  if (loading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <div className="w-10 h-10 rounded-full border-2 border-orange-500/20 border-t-orange-500 animate-spin mb-4" />
        <p className="text-[10px] text-muted-foreground/40 font-bold uppercase tracking-widest">Synchronizing global data...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col space-y-6 p-4 md:p-8">
      {/* Controls Section */}
      <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex gap-2 p-1 bg-card/95 shadow-sm border border-border/20 rounded-2xl w-fit">
            <button
              onClick={() => { setSortType('pnl'); setPage(1); }}
              className={`px-4 py-2 text-[10px] font-bold rounded-xl transition-all flex items-center gap-2 ${sortType === 'pnl'
                ? 'bg-orange-500/10 text-orange-400 shadow-sm'
                : 'text-muted-foreground/40 hover:text-foreground'
                }`}
            >
              <TrendingUp className="w-3 h-3" />
              Top PnL
            </button>
            <button
              onClick={() => { setSortType('volume'); setPage(1); }}
              className={`px-4 py-2 text-[10px] font-bold rounded-xl transition-all flex items-center gap-2 ${sortType === 'volume'
                ? 'bg-orange-500/10 text-orange-400 shadow-sm'
                : 'text-muted-foreground/40 hover:text-foreground'
                }`}
            >
              <BarChart2 className="w-3 h-3" />
              Top Volume
            </button>
          </div>

          <div className="flex gap-1.5 p-1 bg-card/95 shadow-sm border border-border/20 rounded-2xl w-fit">
            {(['24H', '7D', '30D', 'ALL_TIME'] as WindowType[]).map((type) => (
              <button
                key={type}
                onClick={() => { setWindowType(type); setPage(1); }}
                className={`px-3 py-2 text-[9px] font-bold rounded-xl transition-all ${windowType === type
                  ? 'bg-orange-500/10 text-orange-400 shadow-sm'
                  : 'text-muted-foreground/40 hover:text-foreground'
                  }`}
              >
                {type === 'ALL_TIME' ? 'All Time' : type}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/30 group-focus-within:text-orange-500 transition-colors" />
            <input
              type="text"
              placeholder="Search Address..."
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="bg-card/95 border border-border/20 rounded-2xl pl-9 pr-4 py-2 text-[10px] font-bold w-full md:w-64 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-all placeholder:text-muted-foreground/20 text-foreground"
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={isSearching}
            className="h-9 px-6 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border-none rounded-2xl text-[10px] font-bold uppercase transition-all"
          >
            {isSearching ? '...' : 'Search'}
          </Button>
        </div>
      </div>

      {/* Podium Section */}
      {!searchResult && page === 1 && podiumItems.length === 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 items-end justify-items-center py-6 md:py-10 px-4 relative max-w-4xl mx-auto mb-4 md:mb-8">
          {/* Rank 2 */}
          <div className="order-2 md:order-1 flex flex-col items-center scale-90 md:scale-100">
            <div className="relative mb-2 group rotate-[-2deg]">
              <div className="absolute -inset-1 bg-gradient-to-b from-orange-500/20 to-transparent blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
              <img
                src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${podiumItems[1].wallet_address}`}
                alt="Avatar"
                className="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-orange-500/10 border-2 border-orange-500/20 relative z-10"
              />
            </div>
            <div className="w-40 md:w-48 h-20 md:h-28 bg-gradient-to-t from-card/80 to-card/40 border-x border-t border-border/20 rounded-t-[1.5rem] md:rounded-t-[2.5rem] relative flex flex-col items-center justify-center p-4 shadow-2xl">
              <p className="text-[8px] md:text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest mb-1">[2] rank</p>
              <p className="text-[10px] font-mono text-foreground/80 mb-1 truncate max-w-full px-2 text-center">
                {podiumItems[1].wallet_address.slice(0, 4)}...{podiumItems[1].wallet_address.slice(-4)}
              </p>
              <p className="text-xs md:text-base font-bold text-foreground flex items-center gap-1">
                <span className="text-orange-500">◈</span>
                {formatNumber(parseFloat(sortType === 'pnl' ? podiumItems[1].pnl_usd : podiumItems[1].volume_usd))}
              </p>
            </div>
          </div>

          {/* Rank 1 */}
          <div className="order-1 md:order-2 flex flex-col items-center -translate-y-2 md:-translate-y-6 z-10 scale-100 md:scale-110">
            <div className="relative mb-3 group">
              <div className="absolute -inset-2 bg-gradient-to-b from-orange-500/40 to-transparent blur-xl opacity-30 transition-opacity group-hover:opacity-100" />
              <img
                src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${podiumItems[0].wallet_address}`}
                alt="Avatar"
                className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-orange-500/20 border-2 border-orange-500/40 relative z-10 shadow-[0_0_20px_rgba(249,115,22,0.1)]"
              />
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-black font-black text-[10px] border-2 border-background z-20">1</div>
            </div>
            <div className="w-52 md:w-64 h-28 md:h-40 bg-gradient-to-t from-card to-card/60 border-x border-t border-orange-500/20 rounded-t-[2rem] md:rounded-t-[3rem] relative flex flex-col items-center justify-center p-6 shadow-[0_-10px_30px_rgba(0,0,0,0.2)]">
              <p className="text-[9px] md:text-[11px] font-bold text-orange-500 uppercase tracking-[0.2em] mb-1">[1] CHAMPION</p>
              <p className="text-xs font-mono text-foreground mb-2 truncate max-w-full px-2 text-center">
                {podiumItems[0].wallet_address.slice(0, 6)}...{podiumItems[0].wallet_address.slice(-4)}
              </p>
              <p className="text-base md:text-xl font-black text-foreground flex items-center gap-1.5">
                <span className="text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.3)]">◈</span>
                {formatNumber(parseFloat(sortType === 'pnl' ? podiumItems[0].pnl_usd : podiumItems[0].volume_usd))}
              </p>
            </div>
          </div>

          {/* Rank 3 */}
          <div className="order-3 md:order-3 flex flex-col items-center scale-75 md:scale-95 origin-bottom">
            <div className="relative mb-2 group rotate-[2deg]">
              <div className="absolute -inset-1 bg-gradient-to-b from-orange-500/10 to-transparent blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
              <img
                src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${podiumItems[2].wallet_address}`}
                alt="Avatar"
                className="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-orange-500/10 border-2 border-orange-500/20 relative z-10"
              />
            </div>
            <div className="w-36 md:w-48 h-16 md:h-24 bg-gradient-to-t from-card/60 to-card/30 border-x border-t border-border/20 rounded-t-[1.5rem] md:rounded-t-[2.5rem] relative flex flex-col items-center justify-center p-4 shadow-xl">
              <p className="text-[8px] md:text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest mb-1">[3] rank</p>
              <p className="text-[9px] md:text-[10px] font-mono text-foreground/80 mb-1 truncate max-w-full px-2 text-center">
                {podiumItems[2].wallet_address.slice(0, 4)}...{podiumItems[2].wallet_address.slice(-4)}
              </p>
              <p className="text-xs md:text-sm font-bold text-foreground flex items-center gap-1">
                <span className="text-orange-500">◈</span>
                {formatNumber(parseFloat(sortType === 'pnl' ? podiumItems[2].pnl_usd : podiumItems[2].volume_usd))}
              </p>
            </div>
          </div>

          {/* Grid Background */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none -z-10"
            style={{ backgroundImage: 'linear-gradient(#f97316 1px, transparent 1px), linear-gradient(90deg, #f97316 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        </div>
      )}

      {/* Search Result Card */}
      {searchResult && (
        <Card className="bg-orange-500/[0.03] border-orange-500/20 rounded-[2.5rem] p-8 mb-6 relative overflow-hidden group animate-in slide-in-from-top duration-500">
          <div className="absolute top-4 right-4 z-10">
            <Button variant="ghost" size="icon" onClick={() => setSearchResult(null)} className="rounded-full w-8 h-8 hover:bg-orange-500/10 text-muted-foreground/40 hover:text-orange-500">×</Button>
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-3xl bg-orange-500/10 flex items-center justify-center text-orange-500 font-black text-2xl shadow-inner">
                #{searchResult.rank}
              </div>
              <div>
                <p className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.3em] mb-1.5">Personal Performance</p>
                <p className="text-sm font-mono text-foreground/80 tracking-tight">{searchResult.wallet_address}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:flex md:gap-16 gap-x-12 gap-y-6">
              <div>
                <p className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em] mb-2">PnL (USD)</p>
                <p className={`text-xl font-bold ${parseFloat(searchResult.pnl_usd) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {parseFloat(searchResult.pnl_usd) >= 0 ? '+' : '-'}${formatNumber(Math.abs(parseFloat(searchResult.pnl_usd)))}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em] mb-2">Volume (USD)</p>
                <p className="text-xl font-bold text-foreground/80 tracking-tight">${formatNumber(parseFloat(searchResult.volume_usd))}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Table Section */}
      <Card className="flex-1 overflow-hidden bg-card/95 border border-border/20 rounded-[2.5rem] shadow-sm flex flex-col p-6 md:p-10 relative">
        {loading && (
          <div className="absolute inset-0 bg-background/40 backdrop-blur-[2px] z-20 flex items-center justify-center rounded-[2.5rem]">
            <div className="w-8 h-8 border-2 border-orange-500/20 border-t-orange-500 animate-spin rounded-full" />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="text-[9px] md:text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest">
                <th className="px-6 py-3 text-left">Rank</th>
                <th className="px-6 py-3 text-left">Wallet Address</th>
                <th className="px-6 py-3 text-right">PnL (USD)</th>
                <th className="px-6 py-3 text-right">Volume (USD)</th>
              </tr>
            </thead>
            <tbody>
              {tableItems.map((entry) => (
                <tr key={entry.account_id} className="group relative bg-secondary/5 hover:bg-secondary/10 transition-all">
                  <td className="px-6 py-4 first:rounded-l-2xl last:rounded-r-2xl text-xs md:text-sm font-bold text-orange-500/80">
                    #{entry.rank}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 group/addr">
                      <span className="text-[10px] md:text-xs text-foreground/80 font-mono">
                        {entry.wallet_address.slice(0, 6)}...{entry.wallet_address.slice(-4)}
                      </span>
                      <button
                        onClick={() => copyToClipboard(entry.wallet_address)}
                        className="opacity-0 group-hover/addr:opacity-100 p-1 bg-secondary/10 hover:bg-secondary/20 rounded-lg transition-all border border-border/10"
                      >
                        {copiedAddress === entry.wallet_address ? (
                          <Check className="w-2.5 h-2.5 text-green-400" />
                        ) : (
                          <Copy className="w-2.5 h-2.5 text-muted-foreground/30" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-right text-xs md:text-sm font-bold ${parseFloat(entry.pnl_usd) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {parseFloat(entry.pnl_usd) >= 0 ? '+' : '-'}${formatNumber(Math.abs(parseFloat(entry.pnl_usd)))}
                  </td>
                  <td className="px-6 py-4 text-right text-xs md:text-sm font-bold text-foreground/70 tracking-tight last:rounded-r-2xl">
                    ${formatNumber(parseFloat(entry.volume_usd))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between mt-8 pt-8 border-t border-border/10">
          <div className="text-[10px] text-muted-foreground/30 font-bold uppercase tracking-wider">
            Page {page}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => { setPage(Math.max(1, page - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              disabled={page === 1}
              variant="outline"
              className="h-9 px-4 bg-secondary/5 border-border/10 rounded-xl hover:bg-orange-500/10 hover:text-orange-400 transition-all gap-2 text-[10px] font-bold uppercase"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </Button>
            <Button
              onClick={() => { setPage(page + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              disabled={items.length < pageSize}
              variant="outline"
              className="h-9 px-4 bg-secondary/5 border-border/10 rounded-xl hover:bg-orange-500/10 hover:text-orange-400 transition-all gap-2 text-[10px] font-bold uppercase"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Background decoration */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-500/[0.02] blur-[120px] rounded-full pointer-events-none -z-10" />
    </div>
  )
}

