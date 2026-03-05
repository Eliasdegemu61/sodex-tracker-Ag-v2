'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { TrendingUp, HelpCircle, Loader2 } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatNumber } from '@/lib/format-number'
// Removed import { fetchLiveLeaderboardData }

interface Gainer {
  wallet_address: string
  pnl_usd: string
  volume_usd: string
  rank: number
}

export function TopGainersCard() {
  const [gainers, setGainers] = useState<Gainer[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadGainers = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(
          `https://mainnet-data.sodex.dev/api/v1/leaderboard?window_type=24H&sort_by=pnl&sort_order=desc&page=1&page_size=5`
        )
        const json = await response.json()
        if (json.code === 0 && json.data?.items) {
          setGainers(json.data.items)
        }
      } catch (error) {
        console.error('[v0] Error loading gainers:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadGainers()
  }, [])

  if (isLoading) {
    return (
      <Card className="p-5 bg-card/95 shadow-sm border border-border/20 rounded-3xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground/60">Filtering Profits</h3>
          <Loader2 className="w-3 h-3 animate-spin text-muted-foreground/40" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(idx => (
            <div key={idx} className="h-10 bg-secondary/10 rounded-xl animate-pulse" />
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-5 bg-card/95 shadow-sm border border-border/20 rounded-3xl shadow-sm group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-muted-foreground/80 dark:text-muted-foreground/60">Top 5 Gainers</h3>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/40 hover:text-muted-foreground/80 transition-colors cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="bg-popover text-popover-foreground border-border text-xs max-w-[220px]">
                <p>Top 5 traders with the highest PnL in the last 24H</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <TrendingUp className="w-4 h-4 text-green-400/40" />
      </div>

      <div className="space-y-2">
        {gainers.length > 0 ? (
          gainers.map((item, idx) => (
            <div key={item.wallet_address} className="group flex items-center justify-between p-3 bg-secondary/5 rounded-2xl border border-border/5 hover:bg-green-500/5 transition-all duration-300">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-[10px] font-bold text-green-500/60 w-4">#{idx + 1}</span>
                <span className="text-[11px] text-foreground/60 dark:text-foreground/60 text-foreground/80 truncate font-mono">
                  {item.wallet_address.slice(0, 6)}...{item.wallet_address.slice(-4)}
                </span>
              </div>
              <span className="text-[11px] font-bold text-green-400 tracking-tight">+${formatNumber(parseFloat(item.pnl_usd))}</span>
            </div>
          ))
        ) : (
          <div className="text-[10px] text-muted-foreground/30 font-bold   text-center py-6">Identity Shielded</div>
        )}
      </div>
    </Card>
  )
}

