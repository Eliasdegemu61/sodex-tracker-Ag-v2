'use client'

import { Card } from '@/components/ui/card'
import { TrendingUp, ArrowUpRight } from 'lucide-react'
import { useVolumeData } from '@/context/volume-data-context'
import { getTokenLogo } from '@/lib/token-logos'
import { useMemo } from 'react'

export function TodayTopPairs() {
  const { volumeData, isLoading, error } = useVolumeData()

  // Memoize individual entries for Top 5 Spot and Top 5 Futures
  const allEntries = useMemo(() => {
    const todayData = volumeData?.today_stats
    if (!todayData) return []

    const spotEntries = todayData.top_5_spot.map(p => ({ ...p, type: 'SPOT' as const }))
    const futuresEntries = todayData.top_5_futures.map(p => ({ ...p, type: 'FUTURES' as const }))

    // Combine and take top 5 overall performers by volume
    return [...spotEntries, ...futuresEntries]
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5)
  }, [volumeData?.today_stats])

  const formatVolume = (volume: number | undefined) => {
    if (volume === undefined) return '-'
    if (volume >= 1e6) return (volume / 1e6).toFixed(2) + 'M'
    if (volume >= 1e3) return (volume / 1e3).toFixed(2) + 'K'
    return volume.toFixed(2)
  }

  if (error) {
    return (
      <Card className="p-5 bg-card/95 shadow-sm border border-red-500/20 rounded-3xl">
        <h3 className="text-[10px] font-bold  text-red-400/60  mb-2">Sync Error</h3>
        <p className="text-[10px] text-muted-foreground/30 font-bold uppercase ">{error}</p>
      </Card>
    )
  }

  if (isLoading || !volumeData) {
    return (
      <Card className="p-5 bg-card/95 shadow-sm border border-border/20 rounded-3xl animate-pulse">
        <div className="space-y-3">
          <div className="h-2 bg-secondary/10 rounded-full w-1/4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(idx => (
              <div key={idx} className="h-24 bg-secondary/10 rounded-2xl" />
            ))}
          </div>
        </div>
      </Card>
    )
  }

  const todayData = volumeData?.today_stats

  return (
    <Card className="p-6 bg-card/95 shadow-sm border border-border/20 rounded-[2rem] shadow-sm overflow-hidden flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col">
          <h3 className="text-sm font-bold text-foreground/80 tracking-tight">Today's Top Performers</h3>
          <span className="text-[10px] text-muted-foreground/40 font-mono mt-0.5">{todayData.date}</span>
        </div>
        <TrendingUp className="w-4 h-4 text-orange-400/20" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {allEntries.length > 0 ? (
          allEntries.map((entry, idx) => {
            return (
              <div key={`${entry.pair}-${entry.type}`} className="group relative flex flex-col p-4 bg-secondary/5 rounded-3xl border border-border/10 hover:bg-orange-500/5 hover:border-orange-500/20 transition-colors duration-500 transform-gpu">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="relative">
                    {getTokenLogo(entry.pair) ? (
                      <img
                        src={getTokenLogo(entry.pair)}
                        alt={entry.pair}
                        className="w-8 h-8 rounded-full bg-background/50 p-1 border border-border/10 group-hover:border-orange-500/30 transition-colors"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-[10px] font-bold text-orange-400">
                        {entry.pair.slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-[11px] font-bold text-foreground/90 truncate leading-tight" title={entry.pair}>{entry.pair}</span>
                    <span className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${entry.type === 'SPOT' ? 'text-orange-400/80' : 'text-orange-600/80'}`}>
                      {entry.type}
                    </span>
                  </div>
                </div>

                <div className="mt-auto">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest">Volume</span>
                    <span className="text-sm font-bold text-foreground/90">${formatVolume(entry.volume)}</span>
                  </div>
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowUpRight className="w-3 h-3 text-orange-500/40" />
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="col-span-full py-12 flex flex-col items-center justify-center space-y-2 opacity-30">
            <div className="text-2xl">🔒</div>
            <div className="text-xs font-bold uppercase tracking-widest">Identity Shielded</div>
          </div>
        )}
      </div>
    </Card>
  )
}

