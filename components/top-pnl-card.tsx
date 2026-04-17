'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

const formatNumber = (num: number): string => {
  if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`
  if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(2)}K`
  return num.toFixed(2)
}

const formatAddress = (addr: string) =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : 'N/A'

const WINDOWS = ['24H', '7D', '30D', 'ALL_TIME'] as const
type Window = (typeof WINDOWS)[number]

export function TopPnlCard() {
  const [traders, setTraders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [window, setWindow] = useState<Window>('ALL_TIME')

  useEffect(() => {
    setLoading(true)
    setTraders([])
    fetch(
      `https://mainnet-data.sodex.dev/api/v1/leaderboard?window_type=${window}&sort_by=pnl&sort_order=desc&page=1&page_size=5`
    )
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 0 && Array.isArray(json.data?.items)) {
          setTraders(json.data.items)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [window])

  return (
    <Card className="p-5 bg-background border border-border rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-muted-foreground/80">Top Performers PnL</h3>
        <div className="flex items-center gap-4">
          {WINDOWS.map((w) => (
            <button
              key={w}
              onClick={() => setWindow(w)}
              className={`text-[10px] font-black transition-all uppercase tracking-wider pb-1 ${window === w
                  ? 'text-foreground border-b-2 border-foreground'
                  : 'text-muted-foreground/30 hover:text-muted-foreground border-b-2 border-transparent'
                }`}
            >
              {w === 'ALL_TIME' ? 'ALL' : w}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {loading ? (
          [1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-secondary/10 rounded-xl animate-pulse" />
          ))
        ) : traders.length > 0 ? (
          traders.map((t) => (
            <div
              key={t.wallet_address}
              className="flex items-center justify-between p-3 bg-secondary/5 rounded-xl border border-border/5 hover:bg-emerald-500/5 transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-[10px] font-bold text-emerald-500/60 w-5">#{t.rank}</span>
                <span className="text-[11px] text-foreground/70 font-mono truncate">
                  {formatAddress(t.wallet_address)}
                </span>
              </div>
              <span className="text-[11px] font-bold text-emerald-400 shrink-0">
                {parseFloat(t.pnl_usd) >= 0 ? '+' : '-'}${formatNumber(Math.abs(parseFloat(t.pnl_usd)))}
              </span>
            </div>
          ))
        ) : (
          <div className="text-[10px] text-muted-foreground/30 font-bold text-center py-6">
            No data
          </div>
        )}
      </div>
    </Card>
  )
}
