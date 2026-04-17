'use client'

import { Card } from '@/components/ui/card'
import { formatNumber } from '@/lib/format-number'
import { useState, useMemo } from 'react'
import { useDexData } from '@/context/dex-data-context'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { HelpCircle } from 'lucide-react'

interface PerpTrader {
  userId: string
  address: string
  pnl: number
  vol: number
  rank: number
}

function formatAddress(address: string) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'N/A'
}

export function TopTradersCard() {
  const { overallStats, isLoading } = useDexData()
  const [activeTab, setActiveTab] = useState<'all' | 'spot' | 'futures'>('futures')
  
  const traders = useMemo(() => {
    if (!overallStats) return []
    if (activeTab === 'all') {
      const all = [...(overallStats.top_5_futures_vol || []), ...(overallStats.top_5_spot_vol || [])]
      return all.sort((a, b) => b.vol - a.vol).slice(0, 5)
    }
    return activeTab === 'spot' ? overallStats.top_5_spot_vol || [] : overallStats.top_5_futures_vol || []
  }, [overallStats, activeTab])

  if (isLoading) {
    return (
      <Card className="p-5 bg-background border border-border rounded-lg animate-pulse">
        <h3 className="text-xs font-semibold text-muted-foreground/60 mb-4">Indexing Whales</h3>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-8 bg-secondary/10 rounded-xl" />
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-5 bg-background border border-border rounded-lg group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-muted-foreground/80 dark:text-muted-foreground/60">Top Performers</h3>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/40 hover:text-muted-foreground/80 transition-colors cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="bg-popover text-popover-foreground border-border text-xs max-w-[220px]">
                <p>top traders with the biggest volume split by category</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="flex items-center gap-4">
          {(['all', 'spot', 'futures'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`text-[10px] font-black transition-all uppercase tracking-wider pb-1 ${
                activeTab === t
                  ? 'text-foreground border-b-2 border-foreground'
                  : 'text-muted-foreground/30 hover:text-muted-foreground border-b-2 border-transparent'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {traders.length > 0 ? (
          traders.map((trader: PerpTrader, idx: number) => (
            <div key={trader.address} className="flex items-center justify-between p-3 bg-secondary/5 rounded-2xl border border-border/5 hover:bg-orange-500/5 transition-all duration-300">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-[10px] font-bold text-orange-500/60 w-4">#{idx + 1}</span>
                <span className="text-[11px] text-foreground/60 dark:text-foreground/60 text-foreground/80 truncate font-mono">
                  {trader.address.slice(0, 6)}...{trader.address.slice(-4)}
                </span>
              </div>
              <span className="text-[11px] font-bold text-foreground/80 tracking-tight">${formatNumber(trader.vol)}</span>
            </div>
          ))
        ) : (
          <div className="text-[10px] text-muted-foreground/30 font-bold   text-center py-6">Intelligence Blank</div>
        )}
      </div>
    </Card>
  )
}

