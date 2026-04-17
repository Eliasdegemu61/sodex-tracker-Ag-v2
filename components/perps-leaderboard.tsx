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

  // Instant filtering for search results
  useEffect(() => {
    if (searchAddress.trim() && searchResult) {
      handleSearch()
    }
  }, [sortType, windowType])

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
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-border border-t-foreground animate-spin mb-4" />
        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col space-y-6 p-4 md:p-8">
      {/* Controls Section */}
      <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setSortType('pnl'); setPage(1); }}
              className={`px-3 py-1.5 text-[10px] font-bold transition-all flex items-center gap-1.5 border-b ${
                sortType === 'pnl' ? 'text-foreground border-foreground' : 'text-muted-foreground/50 border-transparent hover:text-muted-foreground'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              Top PnL
            </button>
            <button
              onClick={() => { setSortType('volume'); setPage(1); }}
              className={`px-3 py-1.5 text-[10px] font-bold transition-all flex items-center gap-1.5 border-b ${
                sortType === 'volume' ? 'text-foreground border-foreground' : 'text-muted-foreground/50 border-transparent hover:text-muted-foreground'
              }`}
            >
              <BarChart2 className="w-3 h-3" />
              Top Volume
            </button>
          </div>

          <div className="flex items-center gap-1">
            {(['24H', '7D', '30D', 'ALL_TIME'] as WindowType[]).map((type) => (
              <button
                key={type}
                onClick={() => { setWindowType(type); setPage(1); }}
                className={`px-2.5 py-1.5 text-[9px] font-bold transition-all border-b ${
                  windowType === type ? 'text-foreground border-foreground' : 'text-muted-foreground/50 border-transparent hover:text-muted-foreground'
                }`}
              >
                {type === 'ALL_TIME' ? 'All Time' : type}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/30" />
            <input
              type="text"
              placeholder="Search address..."
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-[10px] font-bold w-full md:w-64 focus:outline-none focus:ring-1 focus:ring-border transition-all placeholder:text-muted-foreground/30 text-foreground"
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={isSearching}
            className="h-9 px-5 bg-foreground hover:bg-foreground/90 text-background border-none rounded-lg text-[10px] font-bold uppercase transition-all"
          >
            {isSearching ? '...' : 'Search'}
          </Button>
        </div>
      </div>

      {/* Podium Section */}
      {!searchResult && page === 1 && podiumItems.length === 3 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-8 items-end justify-items-center py-4 md:py-10 px-2 md:px-4 relative max-w-4xl mx-auto mb-4 md:mb-8">
          {/* Rank 2 */}
          <div className="order-2 md:order-1 flex flex-col items-center scale-90 md:scale-100">
            <div className="relative mb-2">
              <img
                src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${podiumItems[1].wallet_address}`}
                alt="Avatar"
                className="w-10 h-10 md:w-16 md:h-16 rounded-xl bg-secondary/20 border border-border relative z-10"
              />
            </div>
            <div className="w-full min-w-[140px] md:w-48 h-12 md:h-28 bg-background border-x border-t border-border rounded-t-xl relative flex flex-col items-center justify-center p-2 md:p-4">
              <p className="text-[8px] md:text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest mb-1">#2</p>
              <p className="text-[10px] font-mono text-foreground/80 mb-1 truncate max-w-full px-2 text-center">
                {podiumItems[1].wallet_address.slice(0, 4)}...{podiumItems[1].wallet_address.slice(-4)}
              </p>
              <p className="text-xs md:text-base font-bold text-foreground">
                ${formatNumber(parseFloat(sortType === 'pnl' ? podiumItems[1].pnl_usd : podiumItems[1].volume_usd))}
              </p>
            </div>
          </div>

          {/* Rank 1 */}
          <div className="order-1 md:order-2 flex flex-col items-center -translate-y-2 md:-translate-y-6 z-10 scale-105 md:scale-110">
            <div className="relative mb-3">
              <img
                src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${podiumItems[0].wallet_address}`}
                alt="Avatar"
                className="w-12 h-12 md:w-20 md:h-20 rounded-2xl bg-foreground/5 border-2 border-foreground/20 relative z-10"
              />
              <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-foreground rounded-full flex items-center justify-center text-background font-black text-[8px] md:text-[10px] border-2 border-background z-20">1</div>
            </div>
            <div className="w-full min-w-[160px] md:w-64 h-20 md:h-40 bg-background border-x border-t border-foreground/30 rounded-t-2xl md:rounded-t-[2rem] relative flex flex-col items-center justify-center p-3 md:p-6">
              <p className="text-[9px] md:text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-1">#1 RANK</p>
              <p className="text-xs font-mono text-foreground mb-2 truncate max-w-full px-2 text-center">
                {podiumItems[0].wallet_address.slice(0, 6)}...{podiumItems[0].wallet_address.slice(-4)}
              </p>
              <p className="text-base md:text-xl font-black text-foreground">
                ${formatNumber(parseFloat(sortType === 'pnl' ? podiumItems[0].pnl_usd : podiumItems[0].volume_usd))}
              </p>
            </div>
          </div>

          {/* Rank 3 */}
          <div className="order-3 md:order-3 flex flex-col items-center scale-85 md:scale-95 origin-bottom">
            <div className="relative mb-2">
              <img
                src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${podiumItems[2].wallet_address}`}
                alt="Avatar"
                className="w-10 h-10 md:w-16 md:h-16 rounded-xl bg-secondary/20 border border-border relative z-10"
              />
            </div>
            <div className="w-full min-w-[120px] md:w-48 h-10 md:h-24 bg-background border-x border-t border-border rounded-t-lg md:rounded-t-xl relative flex flex-col items-center justify-center p-2 md:p-4">
              <p className="text-[8px] md:text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest mb-1">#3</p>
              <p className="text-[9px] md:text-[10px] font-mono text-foreground/80 mb-1 truncate max-w-full px-2 text-center">
                {podiumItems[2].wallet_address.slice(0, 4)}...{podiumItems[2].wallet_address.slice(-4)}
              </p>
              <p className="text-xs md:text-sm font-bold text-foreground">
                ${formatNumber(parseFloat(sortType === 'pnl' ? podiumItems[2].pnl_usd : podiumItems[2].volume_usd))}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search Result Card */}
      {searchResult && (
        <Card className="bg-background border border-border rounded-xl p-4 md:p-6 mb-4 relative overflow-hidden animate-in slide-in-from-top duration-300">
          <div className="absolute top-3 right-3">
            <Button variant="ghost" size="icon" onClick={() => setSearchResult(null)} className="rounded-lg w-7 h-7 hover:bg-secondary/10 text-muted-foreground/50 hover:text-foreground">×</Button>
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-secondary/10 border border-border flex items-center justify-center font-black text-[10px] md:text-sm text-foreground shrink-0">
                #{searchResult.rank}
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-1">Personal Performance</p>
                <p className="text-sm font-mono text-foreground/80">{searchResult.wallet_address}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:flex md:gap-12 gap-x-12 gap-y-4">
              <div>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">PnL (USD)</p>
                <p className={`text-xl font-bold ${parseFloat(searchResult.pnl_usd) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {parseFloat(searchResult.pnl_usd) >= 0 ? '+' : '-'}${formatNumber(Math.abs(parseFloat(searchResult.pnl_usd)))}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Volume (USD)</p>
                <p className="text-xl font-bold text-foreground">${formatNumber(parseFloat(searchResult.volume_usd))}</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Table Section */}
      <Card className="flex-1 overflow-hidden bg-background border border-border rounded-xl shadow-sm flex flex-col p-3 md:p-8 relative">
        {loading && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-20 flex items-center justify-center rounded-xl">
            <div className="w-6 h-6 border-2 border-border border-t-foreground animate-spin rounded-full" />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="text-[8px] md:text-[10px] font-bold text-muted-foreground/30 uppercase tracking-widest border-b border-border/5">
                <th className="px-2 md:px-6 py-3 text-left min-w-[50px] md:min-w-[80px]">Rank</th>
                <th className="px-2 md:px-6 py-3 text-left">Wallet</th>
                <th className="px-2 md:px-6 py-3 text-right">PnL</th>
                <th className="px-2 md:px-6 py-3 text-right">Volume</th>
              </tr>
            </thead>
            <tbody>
              {tableItems.map((entry) => (
                <tr key={entry.account_id} className="group relative border-b border-border/5 last:border-0 hover:bg-secondary/5 transition-all">
                  <td className="px-2 md:px-6 py-3 md:py-4 text-[10px] md:text-sm font-bold text-muted-foreground tabular-nums">
                    #{entry.rank}
                  </td>
                  <td className="px-2 md:px-6 py-3 md:py-4">
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
                  <td className={`px-2 md:px-6 py-3 md:py-4 text-right text-[10px] md:text-sm font-bold tabular-nums ${parseFloat(entry.pnl_usd) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {parseFloat(entry.pnl_usd) >= 0 ? '+' : '-'}${formatNumber(Math.abs(parseFloat(entry.pnl_usd)))}
                  </td>
                  <td className="px-2 md:px-6 py-3 md:py-4 text-right text-[10px] md:text-sm font-bold text-foreground/70 tracking-tight tabular-nums">
                    ${formatNumber(parseFloat(entry.volume_usd))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
            Page {page}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => { setPage(Math.max(1, page - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              disabled={page === 1}
              variant="outline"
              className="h-8 px-4 bg-transparent border-border rounded-lg hover:bg-secondary/10 hover:text-foreground transition-all gap-2 text-[10px] font-bold uppercase"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </Button>
            <Button
              onClick={() => { setPage(page + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              disabled={items.length < pageSize}
              variant="outline"
              className="h-8 px-4 bg-transparent border-border rounded-lg hover:bg-secondary/10 hover:text-foreground transition-all gap-2 text-[10px] font-bold uppercase"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

