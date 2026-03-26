'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { HelpCircle } from 'lucide-react'
import { useVolumeData } from '@/context/volume-data-context'
import { getTokenLogo } from '@/lib/token-logos'
import { cn } from '@/lib/utils'

export function TopPairsWidget() {
  const { volumeData, isLoading } = useVolumeData()
  const [activeTab, setActiveTab] = useState('all')

  const formatVolume = (volume: number | undefined) => {
    if (!volume) return '0'
    if (volume >= 1e9) return (volume / 1e9).toFixed(2) + 'B'
    if (volume >= 1e6) return (volume / 1e6).toFixed(2) + 'M'
    if (volume >= 1e3) return (volume / 1e3).toFixed(2) + 'K'
    return volume.toFixed(2)
  }

  if (isLoading || !volumeData) {
    return (
      <Card className="p-8 bg-card border border-border/50 rounded-2xl animate-pulse">
        <div className="h-4 w-32 bg-secondary/20 rounded-full mb-8" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-secondary/10 rounded-xl" />
          ))}
        </div>
      </Card>
    )
  }

  const stats = volumeData.all_time_stats
  const allTopPairs = [...stats.top_5_spot, ...stats.top_5_futures]
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 5)

  let currentItems: { pair: string, volume: number }[] = []
  if (activeTab === 'all') {
    currentItems = allTopPairs
  } else if (activeTab === 'spot') {
    currentItems = stats.top_5_spot
  } else {
    currentItems = stats.top_5_futures
  }

  const COLORS = ['#FF4D00', '#EA580C', '#F97316', '#FB923C', '#FDBA74']
  const maxVolume = Math.max(...currentItems.map(i => i.volume))

  return (
    <Card className="p-6 md:p-8 bg-card border border-border/50 rounded-2xl flex flex-col transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-muted-foreground/80 dark:text-muted-foreground/60 uppercase tracking-wider">Volume Split</h3>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/30 hover:text-muted-foreground transition-colors cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="bg-popover border-border text-[10px] max-w-[200px]">
                <p>Volume distribution among top performing pairs.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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

      {/* Main List with Bars */}
      <div className="space-y-4">
        {currentItems.map((item, index) => {
          const percentage = (item.volume / maxVolume) * 100
          return (
            <div key={item.pair} className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {getTokenLogo(item.pair) ? (
                      <img
                        src={getTokenLogo(item.pair)}
                        alt={item.pair}
                        className="w-7 h-7 rounded-full bg-background p-0.5 border border-border/50 transition-colors"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">{item.pair.slice(0, 1)}</div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-foreground/80 transition-colors">{item.pair}</span>
                    <span className="text-[8px] text-muted-foreground/30 font-bold uppercase tracking-tight">{item.pair.includes('-') ? 'Futures' : 'Spot'}</span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-foreground/90 tabular-nums">${formatVolume(item.volume)}</span>
              </div>
              
              <div className="relative h-1.5 w-full bg-secondary/10 dark:bg-white/[0.02] rounded-full overflow-hidden">
                <div 
                  className="absolute inset-y-0 left-0 transition-all duration-1000 ease-out rounded-full"
                  style={{ 
                    width: `${percentage}%`,
                    backgroundColor: COLORS[index % COLORS.length]
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Subtle Totals at Bottom */}
      <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-border/50">
        <div className="flex flex-col">
          <span className="text-[8px] text-muted-foreground/40 font-bold uppercase tracking-wider mb-1">Total Spot</span>
          <span className="text-sm font-bold text-foreground/80">${formatVolume(stats.total_spot_volume)}</span>
        </div>
        <div className="flex flex-col items-end text-right">
          <span className="text-[8px] text-muted-foreground/40 font-bold uppercase tracking-wider mb-1">Total Futures</span>
          <span className="text-sm font-bold text-foreground/80">${formatVolume(stats.total_futures_volume)}</span>
        </div>
      </div>
    </Card>
  )
}

