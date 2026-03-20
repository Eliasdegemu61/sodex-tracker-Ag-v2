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
      <Card className="p-5 bg-card border border-destructive/20 rounded-2xl">
        <h3 className="text-[10px] font-bold text-destructive/60 mb-2">Sync Error</h3>
        <p className="text-[10px] text-muted-foreground/30 font-bold uppercase ">{error}</p>
      </Card>
    )
  }

  if (isLoading || !volumeData) {
    return (
      <Card className="p-5 bg-card border border-border/50 rounded-2xl animate-pulse">
        <div className="space-y-3">
          <div className="h-2 bg-white/5 rounded-full w-1/4" />
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4, 5].map(idx => (
              <div key={idx} className="h-16 bg-white/5 rounded-2xl" />
            ))}
          </div>
        </div>
      </Card>
    )
  }

  const todayData = volumeData?.today_stats

  return (
    <Card className="p-6 bg-card border border-border/50 rounded-2xl flex flex-col transition-all duration-300 hover:border-primary/30 h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col">
          <h3 className="text-sm font-bold text-foreground/80 tracking-tight">Today's Top Performers</h3>
          <span className="text-[10px] text-muted-foreground/40 font-mono mt-0.5">{todayData.date}</span>
        </div>
        <TrendingUp className="w-4 h-4 text-primary/30" />
      </div>

      <div className="flex flex-col gap-3">
        {allEntries.length > 0 ? (
          allEntries.map((entry, idx) => {
            return (
              <div key={`${entry.pair}-${entry.type}`} className="group relative flex flex-row items-center justify-between p-4 bg-white/[0.02] rounded-2xl border border-border/50 hover:bg-primary/[0.02] hover:border-primary/30 transition-all duration-300">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {getTokenLogo(entry.pair) ? (
                      <img
                        src={getTokenLogo(entry.pair)}
                        alt={entry.pair}
                        className="w-10 h-10 rounded-full bg-background/50 p-1 border border-border/10 group-hover:border-primary/30 transition-colors"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {entry.pair.slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground/90 leading-tight">{entry.pair}</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${entry.type === 'SPOT' ? 'text-primary/70' : 'text-primary'}`}>
                      {entry.type}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest leading-none mb-1">Today's Volume (UTC)</span>
                    <span className="text-base font-bold text-foreground/90">${formatVolume(entry.volume)}</span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-primary/30 group-hover:text-primary transition-colors" />
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

