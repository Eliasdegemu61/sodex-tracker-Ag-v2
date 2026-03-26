'use client'

import { Card } from '@/components/ui/card'
import { ArrowUpRight } from 'lucide-react'
import { useVolumeData } from '@/context/volume-data-context'
import { getTokenLogo } from '@/lib/token-logos'
import { useMemo, useState } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function TodayTopPairs() {
  const { volumeData, isLoading, error } = useVolumeData()
  const [activeTab, setActiveTab] = useState('all')

  const todayData = volumeData?.today_stats

  const currentEntries = useMemo(() => {
    if (!todayData) return []

    if (activeTab === 'all') {
      const spotEntries = todayData.top_5_spot.map(p => ({ ...p, type: 'SPOT' as const }))
      const futuresEntries = todayData.top_5_futures.map(p => ({ ...p, type: 'FUTURES' as const }))
      return [...spotEntries, ...futuresEntries]
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 5)
    } else if (activeTab === 'spot') {
      return todayData.top_5_spot.map(p => ({ ...p, type: 'SPOT' as const }))
    } else {
      return todayData.top_5_futures.map(p => ({ ...p, type: 'FUTURES' as const }))
    }
  }, [todayData, activeTab])

  const formatVolume = (volume: number | undefined) => {
    if (volume === undefined) return '-'
    if (volume >= 1e6) return (volume / 1e6).toFixed(2) + 'M'
    if (volume >= 1e3) return (volume / 1e3).toFixed(2) + 'K'
    return volume.toFixed(2)
  }

  if (error) {
    return (
      <Card className="p-6 bg-card border border-destructive/20 rounded-2xl">
        <h3 className="text-[10px] font-bold text-destructive/60 mb-2 uppercase tracking-wider">Sync Error</h3>
        <p className="text-[10px] text-muted-foreground/30 font-bold uppercase ">{error}</p>
      </Card>
    )
  }

  if (isLoading || !volumeData) {
    return (
      <Card className="p-6 bg-card border border-border/50 rounded-2xl animate-pulse">
        <div className="h-4 w-32 bg-secondary/20 rounded-full mb-8" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(idx => (
            <div key={idx} className="h-16 bg-white/5 rounded-2xl" />
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 md:p-8 bg-card border border-border/50 rounded-2xl flex flex-col transition-all duration-300 h-full">
      <div className="flex items-center justify-between mb-8">
        <div className="flex flex-col">
          <h3 className="text-xs font-semibold text-muted-foreground/80 dark:text-muted-foreground/60 uppercase tracking-wider">Top Performers</h3>
          <span className="text-[9px] text-muted-foreground/30 font-bold mt-1 uppercase tracking-tight">{todayData?.date} (UTC)</span>
        </div>
        
        <Tabs defaultValue="all" onValueChange={(val) => setActiveTab(val)}>
          <TabsList className="bg-secondary/20 dark:bg-white/[0.02] h-8 p-0.5 rounded-lg border border-border/50">
            {['all', 'spot', 'futures'].map((t) => (
              <TabsTrigger 
                key={t}
                value={t} 
                className="rounded-md text-[9px] font-bold uppercase px-3 h-7 data-[state=active]:bg-card data-[state=active]:text-primary dark:data-[state=active]:bg-white/[0.05]"
              >
                {t}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex flex-col gap-3">
        {currentEntries.length > 0 ? (
          currentEntries.map((entry) => {
            return (
              <div key={`${entry.pair}-${entry.type}`} className="relative flex flex-row items-center justify-between p-4 bg-white/[0.02] rounded-2xl border border-border/50 transition-all duration-300">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {getTokenLogo(entry.pair) ? (
                      <img
                        src={getTokenLogo(entry.pair)}
                        alt={entry.pair}
                        className="w-10 h-10 rounded-full bg-background/50 p-1 border border-border/10 transition-colors"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {entry.pair.slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[12px] font-bold text-foreground/90 leading-tight transition-colors">{entry.pair}</span>
                    <span className="text-[8px] text-muted-foreground/30 font-black uppercase tracking-widest mt-0.5">
                      {entry.type}
                    </span>
                  </div>
                </div>

                <div className="flex items-baseline">
                  <span className="text-[11px] font-bold text-foreground/90 tabular-nums">${formatVolume(entry.volume)}</span>
                </div>
              </div>
            )
          })
        ) : (
          <div className="py-12 flex flex-col items-center justify-center space-y-2 opacity-30">
            <div className="text-2xl">🔒</div>
            <div className="text-xs font-bold uppercase tracking-widest">No Data Available</div>
          </div>
        )}
      </div>
    </Card>
  )
}

