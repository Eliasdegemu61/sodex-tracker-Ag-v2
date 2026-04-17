'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { TrendingDown, HelpCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatNumber } from '@/lib/format-number'
import { useDexData } from '@/context/dex-data-context'

interface Loser {
  userId: string
  address: string
  pnl: number
  vol: number
  rank: number
}

export function TopLosersCard() {
  const { overallStats, isLoading } = useDexData()
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const losers = overallStats?.top_5_losers || []

  if (isLoading) {
    return (
      <Card className="p-5 bg-background border border-border rounded-lg animate-pulse">
        <h3 className="text-xs font-semibold text-muted-foreground/60 mb-4">Scanning Drawdowns</h3>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(idx => (
            <div key={idx} className="h-10 bg-secondary/10 rounded-xl" />
          ))}
        </div>
      </Card>
    )
  }

  const formatAddress = (address: string) => {
    return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'N/A'
  }

  return (
    <Card className="p-5 bg-background border border-border rounded-lg group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-muted-foreground/80 dark:text-muted-foreground/60">Top 5 Losers</h3>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/40 hover:text-muted-foreground/80 transition-colors cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="bg-popover text-popover-foreground border-border text-xs max-w-[220px]">
                <p>top 5 traders with the biggest loss on futures trading</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <TrendingDown className="w-4 h-4 text-red-400/40" />
      </div>

      <div className="space-y-2">
        {losers.length > 0 ? (
          losers.map((item, idx) => (
            <div key={item.address} className="group flex items-center justify-between p-3 bg-secondary/5 rounded-xl border border-border/5 hover:bg-red-500/5 transition-all duration-300">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-[10px] font-bold text-red-500/60 w-4">#{idx + 1}</span>
                <span className="text-[11px] text-foreground/60 dark:text-foreground/60 text-foreground/80 truncate">{formatAddress(item.address)}</span>
              </div>
              <span className="text-[11px] font-bold text-red-400 tracking-tight">-${formatNumber(Math.abs(item.pnl))}</span>
            </div>
          ))
        ) : (
          <div className="text-[10px] text-muted-foreground/30 font-bold   text-center py-6">Intelligence Blank</div>
        )}
      </div>
    </Card>
  )
}

